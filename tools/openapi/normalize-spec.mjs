const propertyTypeOverrides = {
  'ErrorResponseDto.translationKey': 'string',
  'CurrentUserResponseDto.lastLogin': 'string',
  'CreateQueueDto.currency': 'string',
  'CreateQueueDto.locale': 'string',
  'UpdateQueueDto.currency': 'string',
  'UpdateQueueDto.locale': 'string',
  'CallingTicketResponseDto.currentTicket': 'string',
  'QueueTierResponseDto.currencyOverride': 'string',
  'AssociateQueueTierDto.currency': 'string',
  'UpdateQueueTierDto.currency': 'string',
  'NotificationRuleResponseDto.thresholdValue': 'number',
  'UpdateNotificationRuleDto.thresholdValue': 'number',
  'CreateRegistrationResponseDto.appointmentStatus': 'string',
  'CreateRegistrationResponseDto.scheduledTime': 'string',
  'CreateRegistrationResponseDto.trackingUrl': 'string',
  'CreateRegistrationResponseDto.registrationTrackingTokenValidUntil': 'string',
  'RescheduleRegistrationResponseDto.appointmentStatus': 'string',
  'RescheduleRegistrationResponseDto.scheduledTime': 'string',
  'QueuePreviewItemDto.scheduledTime': 'string',
  'ThreadSessionItemDto.currentRegistrationId': 'number',
  'QueueSessionResponseDto.threadNumber': 'number',
  'QueueSessionResponseDto.disconnectedAt': 'string',
  'QueueSessionResponseDto.takenOverFromSessionId': 'number',
  'QueueSessionResponseDto.reassignedRegistrationId': 'number',
  'CallNextRegistrationResponseDto.scheduledTime': 'string',
  'UpdateRegistrationStatusResponseDto.servedAt': 'string',
};

export default function normalizeSpec(document) {
  const normalized = structuredClone(document);
  const schemas = normalized.components?.schemas ?? {};

  for (const [qualifiedName, type] of Object.entries(propertyTypeOverrides)) {
    const separator = qualifiedName.indexOf('.');
    const schemaName = qualifiedName.slice(0, separator);
    const propertyName = qualifiedName.slice(separator + 1);
    const property = schemas[schemaName]?.properties?.[propertyName];

    if (!property) {
      throw new Error(`OpenAPI normalization target is missing: ${qualifiedName}`);
    }

    property.type = type;
  }

  const dailyResetOrigin = schemas.QueueConfigOriginsResponseDto?.properties?.dailyResetTime;
  if (!dailyResetOrigin) {
    throw new Error(
      'OpenAPI normalization target is missing: QueueConfigOriginsResponseDto.dailyResetTime',
    );
  }
  delete dailyResetOrigin.format;

  return normalized;
}
