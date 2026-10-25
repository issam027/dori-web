import type { DomainTranslations } from '../../types';

export const portfolio: DomainTranslations<typeof import('../fr/portfolio').portfolio> = {
  'portfolio.siteSummary': 'ملخص وضعية {{site}}',
  'portfolio.portfolio.activerCeSite': 'اختيار هذا الموقع',
  'portfolio.portfolio.aucunSiteAutorise': 'لا توجد مقرات مخوّلة',
  'portfolio.portfolio.contexteActif': 'السياق النشط',
  'portfolio.portfolio.continuerSurCeSite': 'مواصلة العمل بهذا المقر',
  'portfolio.portfolio.disponible': 'متاح',
  'portfolio.portfolio.filesActives': 'قوائم انتظار نشطة',
  'portfolio.portfolio.portefeuilleDeSites': 'دليل المقرات والمواقع',
  'portfolio.portfolio.rdvAujourdHui': 'مواعيد اليوم',
  'portfolio.portfolio.selectionnezLeSiteSurLequelVousSouhaitezT':
    'حددوا الموقع الذي ترغبون في مباشرة العمل به.',
  'portfolio.portfolio.sitesAutorises': 'المواقع المخوّلة',
  'portfolio.activeSites': 'المواقع النشطة',
  'portfolio.allSites': 'كافة المواقع والمقرات',
  'portfolio.confirmDeactivate': 'تعطيل الموقع',
  'portfolio.confirmReactivate': 'إعادة تفعيل الموقع',
  'portfolio.createSite': 'إدراج موقع جديد',
  'portfolio.currentContext': 'السياق الحالي',
  'portfolio.deactivateSite': 'تعطيل',
  'portfolio.deactivateSiteNamed': 'تعطيل الموقع {{site}}',
  'portfolio.deactivateWarning':
    'سيتم تعطيل الموقع {{site}} وكافة قوائم الانتظار التابعة له. يمكن التراجع عن هذا الإجراء لاحقاً.',
  'portfolio.displaySites': 'المواقع المعروضة',
  'portfolio.displaySitesHint': 'التنقل السلس بين المواقع النشطة والمعطلة.',
  'portfolio.inactiveSites': 'المواقع المعطلة',
  'portfolio.noInactiveSites': 'لا توجد أي مواقع معطلة',
  'portfolio.reactivateSite': 'إعادة التفعيل',
  'portfolio.workOnSite': 'مباشرة العمل بهذا الموقع',
  'portfolio.reactivateWarning':
    'ستتم إعادة تفعيل الموقع {{site}}. ستبقى قوائم الانتظار معطلة حتى إعادة تفعيل كل منها على حدة.',
  'portfolio.siteDeactivated': 'تم تعطيل الموقع بنجاح',
  'portfolio.siteReactivated': 'تمت إعادة تفعيل الموقع بنجاح',
};
