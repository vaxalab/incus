export default function ContactPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Contact</h1>
      <p className="text-foreground/80 mb-6">
        Get in touch with us for demos, bookings, and inquiries.
      </p>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            General Inquiries
          </h2>
          <p className="text-foreground/70">info@incusaudio.com</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Demo Submissions
          </h2>
          <p className="text-foreground/70">demos@incusaudio.com</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Bookings
          </h2>
          <p className="text-foreground/70">bookings@incusaudio.com</p>
        </div>
      </div>
    </div>
  );
}
