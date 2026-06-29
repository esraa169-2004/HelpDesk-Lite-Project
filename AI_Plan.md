1. AI Task Mapping:

AI-Supported: كتابة الـ Boilerplate code (أكواد البداية)، إنشاء الـ Database tables، وكتابة الـ CSS styling. (السبب: مهام متكررة الـ AI بيخلصها بسرعة).

Human-Led: مراجعة الـ Logic الخاص بالـ RLS policies، التأكد من أمان البيانات، واتخاذ قرارات تصميم الـ Database. (السبب: دي قرارات مصيرية لازم المهندس البشري يضمن دقتها).

2. Context and Access Plan:

Prompt-only context: للمهام البسيطة زي تعديل تنسيق نص أو كتابة تعليق.

Single File Access: لما نطلب منه يصحح Error في ملف معين، بنديله الملف ده بس عشان ما يتوهش في باقي المشروع.

Project Context: عند طلب ميزة جديدة (Feature)، بنديله هيكل المجلدات عشان يفهم الروابط بين الملفات.

************************************************************************************************
1. AI Coding Workflow
Task: Implementing the Ticket Status Update feature in HelpDesk Lite.

Task Framing: I needed to add a "Status" field (Open, In Progress, Resolved) to the tickets.

Context: I provided the AI with schema.sql and the TicketItem.tsx component to ensure it understood the database structure and the UI.

AI Plan: The AI proposed updating the tickets table schema and adding a dropdown menu to the UI.

Human Review: I reviewed the plan and requested to add a "Resolved" state to the RLS policies to ensure security.

Implementation & Verification: I applied the code, then verified it by running a test ticket, changing its status, and checking the database via the Supabase dashboard.

2. Debugging and Verification Example
Scenario: A "403 Forbidden" error when trying to update a ticket status.
Investigation: I inspected the browser console and the network tab in the developer tools.

Evidence: The logs showed that the Row Level Security (RLS) policy was blocking the UPDATE operation because it lacked the correct user authentication check.

Final Decision: I decided to revise the RLS policy. I updated the policy to allow updates only when auth.uid() matches the assigned_agent_id. After applying the fix, I verified that the error disappeared and the status updated successfully
*************************************************************************************************
3. Staying Current Plan
To avoid relying on stale assumptions about AI tools, the team will:

Trusted Sources: Regularly check the official Supabase blog and the Bolt.new GitHub discussions for updates on tool capabilities.

Periodic Review: We will hold a brief weekly sync to discuss if new AI features can safely improve our workflow without compromising code quality.
******************************************************************************************************************************************************

AI Workflow Summary (Brief Explanation)
My AI workflow protects the delivery quality by ensuring AI is used only as a support tool, not a decision-maker. By setting strict context boundaries, I prevent the AI from accessing unnecessary files. The "plan-first" coding approach ensures I review every AI proposal before implementation, while evidence-based debugging and human-led verification ensure that all changes align with the original project requirements, keeping the human in control
