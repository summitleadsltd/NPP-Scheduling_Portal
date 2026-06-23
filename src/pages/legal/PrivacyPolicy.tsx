export function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p>
            New Paradigm Projects (&quot;NPP&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the
            field service scheduling platform accessible at summit-scheduler-lac.vercel.app (the &quot;Service&quot;).
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
            Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
          <h3 className="text-lg font-medium mt-3 mb-1">Account Information</h3>
          <p>
            When your account is created, we collect your name, email address, phone number, and role assignment. Account
            credentials are managed through Supabase Authentication.
          </p>
          <h3 className="text-lg font-medium mt-3 mb-1">Google Calendar Data</h3>
          <p>
            If you connect your Google account, we access your Google Calendar data to read availability (via the FreeBusy
            API), create appointment events, update events when appointments change, and delete events when appointments
            are cancelled. We store your Google OAuth tokens securely to maintain this connection. We only access calendar
            data necessary for scheduling operations.
          </p>
          <h3 className="text-lg font-medium mt-3 mb-1">Appointment Data</h3>
          <p>
            We collect customer names, phone numbers, email addresses, service addresses, appointment types, notes, and
            scheduling information to facilitate field service operations.
          </p>
          <h3 className="text-lg font-medium mt-3 mb-1">Device Information</h3>
          <p>
            When you enable push notifications, we store your device token to deliver notification messages. We also
            collect basic device type information (web, Android, iOS) for notification delivery.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Provide, maintain, and improve the scheduling Service</li>
            <li>Create and manage appointment events in technician Google Calendars</li>
            <li>Calculate optimal scheduling slots based on travel time and technician availability</li>
            <li>Send push notifications for appointment updates, reminders, and scheduling conflicts</li>
            <li>Generate reports for operational oversight</li>
            <li>Authenticate users and enforce role-based access control</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Google API Services User Data Policy</h2>
          <p>
            Our use and transfer of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We only use Google Calendar data for the purposes described in this
            policy (scheduling and appointment management). We do not sell, share, or use Google user data for advertising
            purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Data Storage and Security</h2>
          <p>
            Your data is stored securely in Supabase (PostgreSQL) with Row Level Security policies ensuring users can only
            access data appropriate for their role. Google OAuth tokens are stored encrypted in our database. We use HTTPS
            for all data transmission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Data Sharing</h2>
          <p>
            We do not sell your personal information. We share data only with:
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>Google</strong> — Calendar event data when you connect your Google Calendar</li>
            <li><strong>OpenStreetMap / Nominatim</strong> — Service addresses for geocoding (no personal data)</li>
            <li><strong>OpenRouteService</strong> — Coordinates for travel time calculation (no personal data)</li>
            <li><strong>Firebase Cloud Messaging</strong> — Device tokens for push notification delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Access your personal data through your account settings</li>
            <li>Update your name, email, and phone number</li>
            <li>Disconnect your Google Calendar at any time (Settings → Disconnect Calendar)</li>
            <li>Request deletion of your account and associated data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Data Retention</h2>
          <p>
            We retain your account data and appointment history for as long as your account is active. Google OAuth tokens
            are deleted when you disconnect your calendar. If your account is deleted, all associated data is removed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the
            &quot;Last updated&quot; date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:info@summitleadsltd.com" className="text-primary underline">
              info@summitleadsltd.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
