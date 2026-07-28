/** Remove Radix / scroll-lock layers that block Razorpay checkout clicks. */
export function clearBlockingOverlays(): void {
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.style.overflow = '';
  document.documentElement.removeAttribute('data-scroll-locked');

  document.querySelectorAll('[data-radix-dialog-overlay]').forEach((node) => {
    const el = node as HTMLElement;
    el.style.pointerEvents = 'none';
    el.style.display = 'none';
  });

  document.querySelectorAll('[data-radix-focus-guard]').forEach((node) => {
    node.remove();
  });
}

export const RAZORPAY_OPEN_DELAY_MS = 400;
