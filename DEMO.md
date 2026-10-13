Hook: Medi-Clinic is a workflow dashboard for small outpatient clinics.
Problem: Without it, appointments, billing, and pharmacy stock live in separate tools.
Walk: Sign in as admin > create a patient > edit it > review both charts > sign out.
Decision: I chose server-side role checks because database credentials should stay off the browser.
Limits: App queries use a privileged database role and this demo is not for real patient data; next: enforce user isolation end to end, pass the two-user RLS test, and replace demo credentials before production.
