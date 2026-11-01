export {
  serviceTiersControllerAssociateTier as enableQueueService,
  serviceTiersControllerCreateRule as createQueueServiceRule,
  serviceTiersControllerDeleteRule as deleteQueueServiceRule,
  serviceTiersControllerGetQueueTiers as fetchQueueServices,
  serviceTiersControllerGetRules as fetchQueueServiceRules,
  serviceTiersControllerRemoveQueueTier as disableQueueService,
  serviceTiersControllerUpdateQueueTier as updateQueueService,
  serviceTiersControllerUpdateRule as updateQueueServiceRule,
} from '@/api/generated/tiers/tiers';
