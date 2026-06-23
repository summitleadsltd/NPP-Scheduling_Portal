export function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 21, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the New Paradigm Projects (&quot;NPP&quot;) field service scheduling platform (the
            &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do
            not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
          <p>
            NPP provides an intelligent field service scheduling and dispatch platform that enables organizations to
            manage technician appointments, optimize scheduling based on travel efficiency, and coordinate field
            operations. The Service integrates with Google Calendar for calendar management and uses geolocation services
            for route optimization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. User Accounts</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>Accounts are created by administrators or managers within your organization.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You must notify your administrator immediately of any unauthorized use of your account.</li>
            <li>You agree to provide accurate and current information in your profile.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. User Roles and Access</h2>
          <p>The Service implements role-based access control with four user roles:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li><strong>Admin</strong> — Full system access including user management and all operational features.</li>
            <li><strong>Manager</strong> — Access to dispatch board, unified calendar, reports, user management, and booking.</li>
            <li><strong>Scheduler</strong> — Access to create bookings, manage customers, and view scheduling calendars.</li>
            <li><strong>Technician</strong> — Access to personal calendar, route maps, appointment details, and availability management.</li>
          </ul>
          <p className="mt-2">
            You agree to use the Service only within the scope of your assigned role and organizational policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Google Calendar Integration</h2>
          <p>
            The Service offers optional integration with Google Calendar. By connecting your Google account, you authorize
            NPP to:
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Read your calendar availability to prevent scheduling conflicts</li>
            <li>Create calendar events for new appointments</li>
            <li>Update calendar events when appointments are rescheduled</li>
            <li>Delete calendar events when appointments are cancelled</li>
          </ul>
          <p className="mt-2">
            You may disconnect your Google Calendar at any time through your account settings. Disconnecting will stop
            future calendar synchronization but will not remove events already created in your Google Calendar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Share your account credentials with unauthorized individuals</li>
            <li>Attempt to access data or features beyond your assigned role</li>
            <li>Use the Service for any unlawful purpose</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated tools to scrape or extract data from the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Customer Data</h2>
          <p>
            Customer information entered into the Service (names, addresses, phone numbers) is the responsibility of your
            organization. You agree to collect and use customer data in compliance with applicable privacy laws and
            regulations. NPP processes customer data solely to provide the scheduling Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted access to the Service. The Service
            may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. The Service
            includes offline capabilities through Progressive Web App technology for cached content access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Intellectual Property</h2>
          <p>
            The Service, including its design, features, and code, is owned by New Paradigm Projects. Your use of the
            Service does not grant you any ownership rights to any intellectual property.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, NPP shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to loss of data, revenue, or business
            opportunities, arising from your use of or inability to use the Service. The Service relies on third-party
            services (Google Calendar, OpenStreetMap, OpenRouteService) and NPP is not liable for disruptions to those
            services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">11. Termination</h2>
          <p>
            Your organization&apos;s administrator may deactivate or delete your account at any time. We reserve the right
            to suspend or terminate access to the Service for violation of these terms. Upon termination, your right to
            use the Service ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">12. Changes to Terms</h2>
          <p>
            We may modify these Terms of Service at any time. Changes will be effective when posted. Your continued use of
            the Service after changes are posted constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Maryland, United
            States, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">14. Contact</h2>
          <p>
            For questions about these Terms of Service, contact us at{' '}
            <a href="mailto:info@summitleadsltd.com" className="text-primary underline">
              info@summitleadsltd.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
