const REPORTS_LAST_VIEWED_KEY = 'mc_reports_last_viewed_at';
const REPORT_AUDITS_VIEWED_KEY = 'mc_report_audits_viewed';
const NOTIFICATIONS_UPDATED_EVENT = 'mc:notifications-updated';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStoredTimestamp(key) {
  if (!isBrowser()) return null;
  return localStorage.getItem(key);
}

function setStoredTimestamp(key, value) {
  if (!isBrowser()) return;
  localStorage.setItem(key, value);
}

function getViewedAuditsMap() {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(REPORT_AUDITS_VIEWED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setViewedAuditsMap(value) {
  if (!isBrowser()) return;
  localStorage.setItem(REPORT_AUDITS_VIEWED_KEY, JSON.stringify(value));
}

function getAuditUpdatedAt(report) {
  const audit = Array.isArray(report?.audit) ? report.audit[0] : report?.audit;
  return audit?.updated_at || audit?.created_at || null;
}

function isSubmittedAfterLastViewed(report, lastViewedAt) {
  if (!report?.submitted_at) return false;
  if (!lastViewedAt) return true;
  return new Date(report.submitted_at).getTime() > new Date(lastViewedAt).getTime();
}

export function hasNewAudit(report) {
  const auditUpdatedAt = getAuditUpdatedAt(report);
  if (!auditUpdatedAt) return false;

  const viewedAudits = getViewedAuditsMap();
  const viewedAt = viewedAudits[String(report.id)];
  if (!viewedAt) return true;

  return new Date(auditUpdatedAt).getTime() > new Date(viewedAt).getTime();
}

export function isNewReport(report) {
  const lastViewedAt = getStoredTimestamp(REPORTS_LAST_VIEWED_KEY);
  return isSubmittedAfterLastViewed(report, lastViewedAt);
}

export function getReportNotifications(reports = []) {
  const lastViewedAt = getStoredTimestamp(REPORTS_LAST_VIEWED_KEY);

  const newReportsCount = reports.filter((report) => isSubmittedAfterLastViewed(report, lastViewedAt)).length;
  const reportsWithNewAudits = reports.filter((report) => hasNewAudit(report)).map((report) => String(report.id));

  return {
    newReportsCount,
    reportsWithNewAudits,
    totalCount: newReportsCount + reportsWithNewAudits.length,
  };
}

export function markReportsListViewed() {
  if (!isBrowser()) return;

  const now = new Date().toISOString();
  setStoredTimestamp(REPORTS_LAST_VIEWED_KEY, now);
  notifyNotificationsUpdated();
}

export function markReportAuditViewed(report) {
  if (!isBrowser() || !report?.id) return;

  const auditUpdatedAt = getAuditUpdatedAt(report);
  if (!auditUpdatedAt) return;

  const viewedAudits = getViewedAuditsMap();
  viewedAudits[String(report.id)] = auditUpdatedAt;
  setViewedAuditsMap(viewedAudits);
  notifyNotificationsUpdated();
}

export function notifyNotificationsUpdated() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

export function subscribeToNotificationChanges(callback) {
  if (!isBrowser()) return () => {};

  const handleChange = () => callback();
  const handleStorage = (event) => {
    if (!event.key || [REPORTS_LAST_VIEWED_KEY, REPORT_AUDITS_VIEWED_KEY].includes(event.key)) {
      callback();
    }
  };

  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleChange);
    window.removeEventListener('storage', handleStorage);
  };
}
