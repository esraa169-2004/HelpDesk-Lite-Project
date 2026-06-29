1. Repo-Ready Change Brief
Change: Implementing "Auto-Escalation" for SLA breach.

Purpose: To automatically escalate high-priority tickets if not resolved within 24 hours.

Expected Behavior: Tickets change status to "Escalated" and trigger an alert.

Evidence: Log entries showing timestamp updates and status changes in the database.

2. Branch Plan
Branch Name: feature/auto-escalation-logic

Reason: Explicitly tied to the feature name; bounded strictly to escalation logic, excluding unrelated UI tweaks.

3. Commit Sequence
feat: add auto-escalation trigger function

fix: resolve SLA calculation logic in SQL

docs: update README with escalation workflow

4. Pull Request Draft
Title: Feature: Auto-Escalation on SLA Breach.

Description: This PR adds automated escalation logic. I’ve ensured the RLS policies remain intact. Reviewers should focus on the escalation trigger and potential performance impact on large ticket volumes.

5. Code Review Response Plan
Comment: "Why did you use this SQL trigger?" -> Response: "It provides real-time consistency with less overhead than a secondary worker."

Suggestion: "Can we rename this function?" -> Response: "Great idea, I'll update it to trigger_ticket_escalation for better clarity."

Required Change: "Your policy check is flawed." -> Response: "Thanks for catching that. I've updated the auth.uid() validation in the RLS policy to address the security concern."

6. Merge and Release Checklist
Merge Criteria: All unit tests must pass, and the PR must have one approval from a lead engineer.

Release Criteria: Data migration must be verified on the staging environment, and documentation must be updated for the support team.
