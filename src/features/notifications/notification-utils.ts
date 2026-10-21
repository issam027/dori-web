export const maskRecipient = (recipient?: string) => {
  if (!recipient) return '—';
  const at = recipient.indexOf('@');
  if (at > 0) return `${recipient.slice(0, 2)}***${recipient.slice(at)}`;
  return recipient.length <= 4 ? '••••' : `${recipient.slice(0, 2)}••••${recipient.slice(-2)}`;
};

export const canResendNotification = (status: string, canSend: boolean) =>
  canSend && status === 'failed';
export const notificationStatusTone = (
  status: string,
): 'neutral' | 'success' | 'warning' | 'danger' =>
  status === 'delivered'
    ? 'success'
    : status === 'failed'
      ? 'danger'
      : status === 'pending' || status === 'processing'
        ? 'warning'
        : 'neutral';
