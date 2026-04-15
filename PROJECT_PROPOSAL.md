# Project Proposal

## PawSagip Connect: A Community Animal Rescue, Case Management, and Adoption Coordination Platform

### Prepared From Workspace Analysis

This proposal is based on the two main project areas found in the workspace:

- the public application layer in `src`, which supports community reporting, search, alerts, adoption, and account tracking
- the supporting operational and data design materials in `reference`, which define admin workflows, media handling, shelter coordination, barangay assignment, and structured animal-management processes

---

## 1. Executive Summary

PawSagip Connect is a proposed community-centered digital platform for animal rescue coordination, pet recovery, cruelty reporting, and adoption management. The project is designed to connect citizens, pet owners, barangay personnel, rescue volunteers, and shelters through one unified system instead of relying on fragmented communication channels such as social media posts, private messages, spreadsheets, and manual endorsements.

The proposed system addresses a practical public-service problem: animal-related incidents are time-sensitive, location-dependent, and operationally difficult to manage when information is scattered. A lost pet report, found stray sighting, cruelty complaint, rescue handoff, and adoption endorsement are usually handled in separate informal processes, causing delays, duplicated effort, and inconsistent follow-up.

PawSagip Connect consolidates these workflows into a single platform with two tightly linked environments:

- a public-facing community portal for reporting, browsing, searching, and adoption application
- an operations-facing management environment for barangays, rescuers, and shelters to review, assign, process, and monitor cases

The project is positioned not merely as an animal adoption website, but as a localized animal welfare coordination system that can improve response time, case visibility, and accountability while encouraging responsible community participation.

---

## 2. Background and Rationale

Animal welfare concerns in many Philippine communities remain underserved by formal digital systems. Residents who lose pets or encounter abandoned, injured, or abused animals often turn to Facebook groups, barangay pages, text messages, or direct calls to local contacts. Although these channels are accessible, they create several recurring problems:

- information becomes scattered across unrelated posts and conversations
- there is no standard reporting format for location, evidence, or animal condition
- barangay personnel and volunteers lack a single operational dashboard
- the public cannot easily verify whether a case is already reported or being handled
- shelters and rescuers cannot coordinate adoption and rescue efforts from one shared source of truth
- case histories, outcomes, and accountability records are difficult to maintain

The workspace review shows that PawSagip already models several key realities of this problem space:

- community-submitted lost, found, cruelty, and adoption-related reports
- location-based alert visibility
- personal tracking of reports and applications
- administrative adoption review workflows
- structured media evidence handling for images and videos
- barangay and shelter role relationships
- emerging QR and pet identity concepts for registry use

These elements indicate a strong foundation for a broader project proposal: a community animal welfare operations platform that supports both citizen participation and formal response management.

---

## 3. Problem Statement

There is no unified community platform that enables citizens and local animal welfare stakeholders to report, validate, coordinate, and resolve pet-related incidents efficiently at the barangay and shelter level.

Because of this gap:

- lost pets are harder to reunite with owners
- found animals remain unidentified for longer periods
- cruelty reports may not reach the proper responders quickly
- rescue assignments are not systematically documented
- shelters struggle to maintain a visible and structured adoption pipeline
- applicants receive inconsistent updates on adoption status
- local authorities lack consolidated data for planning and oversight

The absence of an organized digital process reduces rescue effectiveness and weakens trust between the public and responding institutions.

---

## 4. Proposed Project

PawSagip Connect is a web-based animal welfare coordination platform designed to centralize case intake, public awareness, response management, and adoption processing.

The system will provide a complete service loop:

1. A citizen or pet owner submits a report or browses ongoing alerts.
2. The system organizes the case by category, location, and status.
3. Authorized responders or administrators review and act on the case.
4. Case outcomes are updated and made visible to relevant stakeholders.
5. Animals eligible for adoption move into a structured adoption workflow.
6. Users track activity, applications, and updates through their own account records.

Rather than treating reporting, rescue, and adoption as separate products, the platform unifies them under a single operational model.

---

## 5. Vision

To build a trusted digital platform that enables communities to protect, recover, rescue, and rehome animals through faster coordination, clearer accountability, and stronger collaboration between citizens and local responders.

## 6. Mission

To provide a practical and scalable system that transforms informal pet-related reporting and rescue practices into an organized, trackable, and community-supported service workflow.

---

## 7. General Objective

To develop an integrated community animal welfare platform that supports pet incident reporting, rescue coordination, cruelty case escalation, and adoption management through a single structured system.

## 8. Specific Objectives

The project specifically aims to:

- provide residents with an accessible channel for submitting lost, found, cruelty, and animal care reports
- create a live alert and search environment that helps users discover relevant nearby cases quickly
- support barangay and rescue personnel with case-review and case-tracking capabilities
- provide shelters and adoption handlers with a structured adoption application process
- allow users to monitor their own reports and adoption activity
- build a data foundation for pet identity, registry, and future QR-based verification workflows
- improve transparency, response documentation, and operational consistency in local animal welfare efforts

---

## 9. Target Beneficiaries and Stakeholders

### Primary Users

- pet owners who need to report and recover lost animals
- citizens who find strays or witness incidents and want to report them responsibly
- community members searching alerts or adoption opportunities
- prospective adopters seeking a structured adoption process

### Operational Users

- barangay administrators
- rescue volunteers or rescue teams
- shelter staff
- animal welfare coordinators

### Institutional Stakeholders

- local government units
- barangay councils
- community rescue organizations
- partner shelters and foster groups
- animal welfare advocacy groups

---

## 10. Scope of the Proposed System

Based on the scanned application and reference materials, the project scope should cover the following functional domains.

### A. Community Reporting

Users can submit incident reports involving:

- lost pets
- found pets or strays
- cruelty or abuse concerns
- adoption-related rescue endorsements

Reports may include descriptive details, location data, contact information, and supporting media such as photos or videos.

### B. Live Alerts and Discovery

The platform will display current reports in an organized feed, allowing users to:

- browse recent incidents
- filter by case type
- inspect details of a specific case
- use search to locate related reports or animals
- identify incidents relevant to their area

### C. Rescue and Case Management

Operational users will be able to:

- review submitted reports
- update case status
- monitor case progress
- coordinate local handling by barangay or rescue group
- maintain better continuity between report intake and field response

### D. Adoption Management

The platform will support:

- public browsing of adoptable animals
- profile viewing for animals ready for placement
- structured adoption applications
- review and decision workflows for handlers or administrators
- applicant-side progress tracking

### E. User Account and Activity Tracking

Registered users will be able to:

- access personal report history
- review their submitted adoption applications
- monitor progress and case outcomes related to their activity

### F. Administrative and Organizational Control

The proposal also includes operational support for:

- barangay-based case oversight
- shelter-linked adoption records
- team or member assignment structures
- controlled visibility of records by user role or jurisdiction

### G. Future Registry and Identity Extension

The system may later support:

- pet registration
- QR-based identity lookup
- owner linkage for faster recovery and verification

---

## 11. Key Functional Requirements

The proposed platform should include the following core capabilities:

- case submission with category selection and required incident details
- media attachment support for documentation and evidence
- location capture and area association for proper routing and visibility
- searchable and filterable incident and adoption records
- account-based tracking of user submissions
- adoption application intake and status processing
- administrative case review and status management
- role-aware access for public users, responders, and administrators
- case lifecycle visibility from submission to resolution or endorsement

---

## 12. Non-Functional Requirements

To be viable as a community service platform, the project should also satisfy the following quality requirements:

- mobile-first accessibility for users reporting incidents from the field
- clear and simple user flows for urgent reporting situations
- reliable storage and retrieval of media evidence
- secure handling of user accounts and personal contact information
- auditability of case actions and status changes
- scalable data organization for barangays, shelters, teams, and users
- responsive performance for search, browsing, and dashboard use
- maintainable architecture that allows future expansion without major redesign

---

## 13. Proposed System Components

The project should be structured around two major operational components.

### 13.1 Public Community Portal

This component is intended for general users and will support:

- incident reporting
- nearby alert discovery
- search and browsing
- adoption browsing and application
- personal activity tracking

### 13.2 Operations and Administration Portal

This component is intended for authorized stakeholders and will support:

- case review and moderation
- assignment and monitoring of animal-related cases
- adoption application assessment
- pet listing management
- shelter and barangay coordination
- structured updates to operational records

This dual-portal direction is strongly supported by the workspace contents, which show both citizen-facing flows and administrative data contracts.

---

## 14. Proposed Process Flow

At a high level, the proposed operational flow is as follows:

1. A user accesses the platform and chooses a goal such as reporting, searching, or adopting.
2. The user submits a report or application with the required information.
3. The platform stores and categorizes the submission.
4. Relevant public records become discoverable through alerts or search.
5. Authorized personnel review actionable reports.
6. Cases are updated, escalated, resolved, or converted into adoption-ready records when appropriate.
7. Users and administrators track status changes through their respective interfaces.

This process creates a continuous feedback loop between community reporting and institutional action.

---

## 15. Expected Outputs and Deliverables

The proposed project is expected to deliver:

- a functioning public animal incident reporting platform
- a centralized live alert and case-discovery interface
- an adoption listing and application subsystem
- a user dashboard for report and application tracking
- an operations interface for administrative case handling
- structured records for barangays, shelters, teams, and users
- a documented basis for future pet registry and QR identity functions

---

## 16. Expected Benefits

The project can deliver practical benefits across multiple user groups.

### For Citizens

- easier reporting of incidents
- faster visibility of lost and found cases
- more confidence that reports are reaching the right handlers
- clearer adoption opportunities and status feedback

### For Barangays and Responders

- better organization of incoming incidents
- improved status monitoring and documentation
- reduced dependence on informal manual coordination
- stronger accountability for local animal welfare action

### For Shelters

- broader visibility for adoptable animals
- more structured application handling
- clearer linkage between rescue cases and adoption outcomes

### For Communities

- improved rescue coordination
- stronger public participation in animal welfare
- better local data for planning, awareness, and policy support

---

## 17. Risks and Constraints

The project should acknowledge several practical risks:

- incomplete or inaccurate public submissions
- misuse of open reporting features
- privacy concerns around contact details and location data
- varying digital readiness among local stakeholders
- dependence on proper operational adoption by barangays and shelters
- need for moderation and clear case-handling rules

These risks do not invalidate the project, but they require governance, validation, and role-based access planning as part of implementation.

---

## 18. Newly Added: Project Limitations

The proposed project also has several practical limitations that should be acknowledged:

- the platform depends on internet connectivity, which may limit usage in low-signal areas
- the quality of reports depends on the completeness and honesty of user submissions
- location accuracy depends on device permissions, map pin placement, and user-entered details
- the system can support coordination, but it cannot guarantee actual responder action in the field
- adoption decisions will still depend on human review by shelters or administrators
- registry and QR-based identification features may remain partial until supported by formal local implementation
- initial deployment may only cover selected communities, limiting broader generalization at the early stage
- privacy and data protection requirements may restrict how much personal or case-related information can be shown publicly

These limitations do not reduce the value of the project, but they set realistic expectations for deployment and evaluation.

---

## 19. Newly Added: Proposed Budget

For project planning purposes, a practical estimated budget may be organized into the following categories:

| Budget Item | Estimated Cost |
|---|---:|
| Internet and communications | PHP 2,000 - PHP 4,000 |
| Testing devices and load allowance | PHP 3,000 - PHP 6,000 |
| Domain, hosting, or deployment allowance | PHP 2,000 - PHP 5,000 |
| Documentation, printing, and presentation materials | PHP 1,500 - PHP 3,000 |
| Transportation for interviews, validation, or pilot coordination | PHP 3,000 - PHP 8,000 |
| Contingency fund | PHP 2,000 - PHP 5,000 |
| **Estimated Total** | **PHP 15,500 - PHP 31,000** |

For a more realistic academic or pilot implementation, the recommended working budget range is:

- **PHP 20,000 to PHP 30,000**

The final amount may vary depending on whether hosting, field validation, and pilot coordination costs are subsidized or already available.

---

## 20. Newly Added: Proposed Time Frame

A realistic implementation schedule for PawSagip Connect is **five months**, divided into the following phases:

| Phase | Duration | Major Activities |
|---|---|---|
| Planning and Requirements Analysis | Month 1 | problem validation, stakeholder consultation, scope definition, workflow analysis |
| System Design | Month 2 | process design, interface planning, data structure design, role definition |
| Core Development | Month 3 | reporting, alerts, search, user account features |
| Operations and Adoption Module Development | Month 4 | admin workflows, case monitoring, adoption processing, dashboard functions |
| Testing, Revision, and Finalization | Month 5 | system testing, refinement, documentation, presentation preparation |

If needed for a more compressed academic schedule, this can also be adapted into a 12-week implementation plan.

---

## 21. Sustainability and Expansion Potential

PawSagip Connect has strong long-term expansion potential because the core domain is modular. Once reporting, alerts, adoption, and administrative coordination are stable, the platform can expand into:

- QR-based pet registry and owner verification
- automated notifications and reminders
- rescue team assignment workflows
- analytics for case volume, response trends, and adoption performance
- multi-barangay and city-level animal welfare reporting
- partnerships with veterinary offices, shelters, and advocacy groups

This makes the project suitable not only as an academic or capstone implementation, but also as a practical community operations platform with real deployment value.

---

## 22. Implementation Positioning

At this stage, the proposal intentionally does not lock the project to a specific technology stack. The stronger priority is defining the service model, user roles, workflow boundaries, and operational outcomes. The workspace already shows that a functional prototype direction exists, but the proposal should stand independently as a problem-solution document even without naming implementation technologies.

Technology selection, deployment strategy, and infrastructure design can be finalized later based on institutional constraints, budget, and rollout scope.

---

## 23. Conclusion

Based on the scanned workspace, PawSagip should be proposed not simply as a pet rescue website, but as a community animal welfare coordination platform with public-service and operational value. The two analyzed project areas show a coherent direction:

- the public side enables fast reporting, search, alert discovery, and adoption participation
- the operational side supports case handling, organizational oversight, and structured follow-through

The strongest project proposal that emerges from both folders is therefore a full community animal rescue, case management, and adoption coordination system designed for barangays, shelters, and citizens.

If implemented well, PawSagip Connect can reduce fragmented reporting, improve case visibility, strengthen rescue coordination, and create a more accountable and humane local response process for animal welfare concerns.

---

## 24. Proposed Formal Title

**PawSagip Connect: A Community Animal Rescue, Case Management, and Adoption Coordination Platform for Local Communities**
