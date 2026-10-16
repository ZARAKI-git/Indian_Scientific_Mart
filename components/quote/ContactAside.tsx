/** Unconfirmed contact details stay as flags, exactly as the reference: no guessed values go live. */
export function ContactAside() {
  return (
    <aside className="side" data-a>
      <dl className="cbox"><dt>Address</dt><dd>Cuttack, Odisha, India<br /><span className="flag">Street address to confirm</span></dd></dl>
      <dl className="cbox"><dt>Phone</dt><dd><span className="flag">Number to confirm before launch</span></dd></dl>
      <dl className="cbox"><dt>Also listed on</dt><dd>IndiaMART storefront<br /><span className="flag">Exact URL to confirm</span></dd></dl>
      <p className="note">Nothing above becomes a live link until it is confirmed with the client. A guessed phone number is worse than an absent one.</p>
    </aside>
  );
}
