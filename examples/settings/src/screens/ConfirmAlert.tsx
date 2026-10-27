import { useNavigation } from "tvml-react";

/**
 * A confirmation shown with navigation.presentModal(). Both buttons dismiss
 * it; the Menu button dismisses it too, which counts as Cancel.
 */
export function ConfirmAlert({
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const navigation = useNavigation();
  return (
    <alertTemplate theme="dark">
      <title>{title}</title>
      <description>{message}</description>
      <button
        onSelect={() => {
          navigation.dismissModal();
          onConfirm();
        }}
      >
        <text>{confirmLabel}</text>
      </button>
      <button autoHighlight onSelect={() => navigation.dismissModal()}>
        <text>Cancel</text>
      </button>
    </alertTemplate>
  );
}
