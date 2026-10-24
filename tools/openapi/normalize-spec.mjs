const propertyTypeOverrides = {
  'ErrorResponseDto.translationKey': 'string',
  'AuditEventResponseDto.actorDisplayName': 'string',
  'AuditEventResponseDto.targetDisplayName': 'string',
  'AuditEventResponseDto.secondaryTargetDisplayName': 'string',
  'AuditEventResponseDto.siteScopeDisplayName': 'string',
  'AuditEventResponseDto.failureType': 'string',
  'AuditEventDetailResponseDto.actorDisplayName': 'string',
  'AuditEventDetailResponseDto.targetDisplayName': 'string',
  'AuditEventDetailResponseDto.secondaryTargetDisplayName': 'string',
  'AuditEventDetailResponseDto.siteScopeDisplayName': 'string',
  'AuditEventDetailResponseDto.failureType': 'string',
  'AuditEventDetailResponseDto.actorUsername': 'string',
  'AuditEventDetailResponseDto.actorFullName': 'string',
  'AuditEventDetailResponseDto.actorIsActive': 'boolean',
  'AuditEventDetailResponseDto.targetIsActive': 'boolean',
  'AuditEventDetailResponseDto.secondaryTargetIsActive': 'boolean',
  'AuditEventDetailResponseDto.siteScopeLocation': 'string',
  'AuditEventDetailResponseDto.siteScopeTimezone': 'string',
  'AuditEventDetailResponseDto.siteScopeIsActive': 'boolean',
  'CurrentUserResponseDto.lastLogin': 'string',
  'CreateQueueDto.currency': 'string',
  'CreateQueueDto.locale': 'string',
  'UpdateQueueDto.currency': 'string',
  'UpdateQueueDto.locale': 'string',
  'CallingTicketResponseDto.currentTicket': 'string',
  'QueueStatusResponseDto.estimatedWaitMinutes': 'number',
  'QueueTierResponseDto.currencyOverride': 'string',
  'AssociateQueueTierDto.currency': 'string',
  'UpdateQueueTierDto.currency': 'string',
  'NotificationRuleResponseDto.thresholdValue': 'number',
  'UpdateNotificationRuleDto.thresholdValue': 'number',
  'PersonNoteResponseDto.deletedAt': 'string',
  'RegistrationResponseDto.deletedAt': 'string',
  'CreateRegistrationResponseDto.appointmentStatus': 'string',
  'CreateRegistrationResponseDto.scheduledTime': 'string',
  'CreateRegistrationResponseDto.registrationTrackingTokenValidUntil': 'string',
  'CreateRegistrationResponseDto.estimatedWaitMinutes': 'number',
  'RegistrationPositionResponseDto.estimatedWaitMinutes': 'number',
  'RescheduleRegistrationResponseDto.appointmentStatus': 'string',
  'RescheduleRegistrationResponseDto.scheduledTime': 'string',
  'QueuePreviewItemDto.scheduledTime': 'string',
  'ThreadSessionItemDto.connectedAt': 'string',
  'ThreadSessionItemDto.currentRegistrationId': 'string',
  'QueueSessionResponseDto.threadNumber': 'number',
  'QueueSessionResponseDto.connectedAt': 'string',
  'QueueSessionResponseDto.disconnectedAt': 'string',
  'QueueSessionResponseDto.takenOverFromSessionId': 'string',
  'QueueSessionResponseDto.reassignedRegistrationId': 'string',
  'CallNextRegistrationResponseDto.scheduledTime': 'string',
  'UpdateRegistrationStatusResponseDto.servedAt': 'string',
  'MonitoringLiveTotalsDto.longestWaitMinutes': 'number',
  'MonitoringLiveQueueDto.estimatedWaitMinutes': 'number',
  'MonitoringLiveQueueDto.longestWaitMinutes': 'number',
  'MonitoringSeriesMetricsDto.averageWaitMinutes': 'number',
  'MonitoringSeriesMetricsDto.averageServiceMinutes': 'number',
  'MonitoringSeriesBucketDto.averageWaitMinutes': 'number',
  'MonitoringSeriesBucketDto.averageServiceMinutes': 'number',
  'MonitoringQueueBreakdownDto.averageWaitMinutes': 'number',
  'MonitoringQueueBreakdownDto.averageServiceMinutes': 'number',
  'MonitoringUserBreakdownDto.averageServiceMinutes': 'number',
  'MonitoringTierBreakdownDto.averageWaitMinutes': 'number',
};

export default function normalizeSpec(document) {
  const normalized = structuredClone(document);
  const schemas = normalized.components?.schemas ?? {};

  // The current Swagger export duplicates some UUID path parameters with an
  // empty name. The correctly named parameter is already present; discard only
  // those invalid duplicates and assert every path placeholder remains covered.
  for (const [path, pathItem] of Object.entries(normalized.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = pathItem?.[method];
      if (!operation?.parameters) continue;

      operation.parameters = operation.parameters.filter(
        (parameter) => !(parameter?.in === 'path' && parameter.name === ''),
      );

      const placeholders = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      const namedPathParameters = operation.parameters
        .filter((parameter) => parameter?.in === 'path')
        .map((parameter) => parameter.name);
      for (const placeholder of placeholders) {
        if (!namedPathParameters.includes(placeholder)) {
          throw new Error(
            `OpenAPI path parameter is missing after normalization: ${method.toUpperCase()} ${path} (${placeholder})`,
          );
        }
      }
    }
  }

  for (const [qualifiedName, type] of Object.entries(propertyTypeOverrides)) {
    const separator = qualifiedName.indexOf('.');
    const schemaName = qualifiedName.slice(0, separator);
    const propertyName = qualifiedName.slice(separator + 1);
    const property = schemas[schemaName]?.properties?.[propertyName];

    if (!property) {
      throw new Error(`OpenAPI normalization target is missing: ${qualifiedName}`);
    }

    property.type = type;

    if (type === 'string' && propertyName.endsWith('Id')) {
      property.format = 'uuid';
    }
  }

  // Temporary contract repair: all domain identifiers are UUIDs. Keep these
  // assertions until the upstream Swagger document emits the correct types.
  const uuidArrayProperties = [
    'UserScopeDto.siteIds',
    'UserScopeDto.queueIds',
    'MonitoringLiveOperatorDto.queueIds',
    'MonitoringAppliedFiltersDto.queueIds',
    'MonitoringAppliedFiltersDto.userIds',
    'MonitoringAppliedFiltersDto.tierIds',
  ];

  for (const qualifiedName of uuidArrayProperties) {
    const separator = qualifiedName.indexOf('.');
    const schemaName = qualifiedName.slice(0, separator);
    const propertyName = qualifiedName.slice(separator + 1);
    const property = schemas[schemaName]?.properties?.[propertyName];

    if (!property?.items) {
      throw new Error(`OpenAPI UUID array normalization target is missing: ${qualifiedName}`);
    }

    property.items.type = 'string';
    property.items.format = 'uuid';
  }

  const deleteItemId = schemas.DeleteItemResponseDto?.properties?.id;
  if (!deleteItemId) {
    throw new Error('OpenAPI UUID normalization target is missing: DeleteItemResponseDto.id');
  }
  deleteItemId.type = 'string';
  deleteItemId.format = 'uuid';

  const exampleUuid = '00000000-0000-4000-8000-000000000001';
  const normalizeUuidExamples = (value) => {
    if (!value || typeof value !== 'object') return;

    if (value.type === 'string' && value.format === 'uuid' && 'example' in value) {
      value.example = exampleUuid;
    }
    if (value.type === 'array' && value.items?.format === 'uuid' && Array.isArray(value.example)) {
      value.example = value.example.map(
        (_, index) => `${exampleUuid.slice(0, -1)}${((index % 9) + 1).toString()}`,
      );
    }

    for (const child of Object.values(value)) normalizeUuidExamples(child);
  };
  normalizeUuidExamples(normalized);

  const dailyResetOrigin = schemas.QueueConfigOriginsResponseDto?.properties?.dailyResetTime;
  if (!dailyResetOrigin) {
    throw new Error(
      'OpenAPI normalization target is missing: QueueConfigOriginsResponseDto.dailyResetTime',
    );
  }
  delete dailyResetOrigin.format;

  // Swagger currently emits `required: true` on this property schema, while
  // OpenAPI only permits `required` as an array on the containing object.
  const averageHttpDuration =
    schemas.MonitoringMetricsResponseDto?.properties?.derived?.properties
      ?.averageHttpRequestDurationMs;
  if (averageHttpDuration) delete averageHttpDuration.required;

  return normalized;
}
