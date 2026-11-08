const faqs = [
  ['Why was my upload rejected?', 'Check three things: the file format (JPG or PNG), the file size in KB, and the width and height in pixels. Paste the form rules on the home page and we fill them in for you.'],
  ['Are my photos uploaded to a server?', 'No. Image tools, bulk rename and the duplicate finder run in your browser. Your files do not leave your device.'],
  ['Why can I not reach the KB limit?', 'Very small limits at fixed pixel sizes make the image blurry. We show the best possible result and tell you when a rule cannot be met.'],
  ['How do I get Pro?', 'Open Pricing, pay with the QR code, and enter your UPI transaction ID. We check the payment and activate Pro.'],
];

export default function Help() {
  return (
    <main className="wrap narrow2">
      <h1>Help</h1>
      {faqs.map(([q, a]) => (
        <details className="card" key={q}>
          <summary><b>{q}</b></summary>
          <p className="muted">{a}</p>
        </details>
      ))}
    </main>
  );
}
