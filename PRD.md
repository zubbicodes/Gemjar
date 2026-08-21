\# Product Requirements Document (PRD)



\## Gemjar Commerce Platform



\*\*Version:\*\* 1.0

\*\*Status:\*\* Implementation-Ready Draft

\*\*Source of Requirements:\*\* Gemjar Commerce Platform — Solution Scope \& Delivery Blueprint

\*\*Initial Product Catalogue:\*\* Approximately 500 SKUs

\*\*Indicative Delivery Scope:\*\* 18–22 weeks, subject to technical discovery and third-party integration validation



\---



\# 1. Product Overview



\## 1.1 Product Name



\*\*Gemjar Commerce Platform\*\*



\## 1.2 Product Vision



Gemjar requires a new, independent, future-ready digital commerce platform that centralizes its commerce operations while supporting integration with existing external systems.



The platform must support three primary commerce experiences:



1\. \*\*B2C Ecommerce\*\*

2\. \*\*B2B Trade Portal\*\*

3\. \*\*Sales Agent Portal\*\*



All three experiences must operate from a central Gemjar platform and database.



The platform must own and manage its core commerce data, including:



\* Products

\* Customers

\* Customer relationships

\* Pricing

\* Orders

\* Operational activity

\* User permissions

\* Shipment information where applicable



External systems such as Sage 50 and Mintsoft must integrate with the platform where appropriate but must not become permanent foundational dependencies.



The long-term architectural principle is:



> \*\*Gemjar Commerce Platform is the core system. External systems are replaceable integration targets.\*\*



\---



\# 2. Problem Statement



Gemjar requires a unified commerce platform capable of supporting multiple customer and operational workflows without forcing the business to rely permanently on a single accounting, ERP, stock, or fulfilment provider.



The platform must solve the following business requirements:



\* Support direct consumer ecommerce.

\* Support approved B2B/trade customers.

\* Support individual customer-specific pricing.

\* Allow sales agents to manage and order for assigned customers.

\* Centralize orders from B2C, B2B and sales-agent channels.

\* Support complex fulfilment workflows, including partial shipments.

\* Exchange data with Sage 50 and Mintsoft.

\* Support API integrations where appropriate.

\* Support structured import/export where direct integration is unavailable or unsuitable.

\* Provide visibility into integrations, synchronization, failures and retries.

\* Maintain an audit trail of important system activity.

\* Enforce role-based access and data restrictions.

\* Remain extensible so external systems can be replaced in the future.



\---



\# 3. Product Goals



\## 3.1 Primary Goals



\### G1 — Create a central commerce platform



Gemjar must have one central platform responsible for its primary commerce data and workflows.



\### G2 — Support multiple commerce channels



The same platform must support:



\* B2C customers

\* B2B customers

\* Sales agents

\* Internal/admin users



\### G3 — Support customer-specific B2B pricing



Pricing must be configurable at the individual customer level.



\### G4 — Centralize order management



Orders from all channels must be stored and managed through a unified order model.



\### G5 — Support resilient integrations



External integrations must not cause the customer-facing platform to fail if an external system is unavailable.



\### G6 — Enable future replacement of external systems



Sage 50, Mintsoft, payment providers, fulfilment systems and other future systems must be replaceable without rebuilding the core commerce application.



\### G7 — Provide responsive experiences



The platform must work across:



\* Desktop

\* Tablet

\* Mobile



\### G8 — Maintain security and operational visibility



The system must provide:



\* Role-based permissions

\* Audit history

\* Activity tracking

\* Integration logs

\* Import/export history

\* Error reporting



\---



\# 4. Non-Goals



The following should \*\*not be assumed as included unless confirmed during discovery\*\*:



\* Native iOS application

\* Native Android application

\* Full ERP replacement

\* Full accounting system

\* Full warehouse management system

\* Custom payment gateway development

\* Replacement of Sage 50

\* Replacement of Mintsoft

\* Advanced AI functionality

\* Marketplace functionality

\* Multi-vendor marketplace support

\* Loyalty system

\* Subscription commerce

\* Advanced marketing automation



These features may be considered in future phases but are not explicitly defined in the source scope.



The source document also states that several areas require further definition during discovery, including detailed internal administration, returns, cancellation rules, payment-provider specifics and third-party integration details.



\---



\# 5. User Types



The platform must support the following primary user types.



\## 5.1 B2C Consumer



A standard retail customer.



\### Primary capabilities



\* Browse products.

\* Search products.

\* Filter products.

\* Add products to basket.

\* Checkout.

\* Make payment.

\* Register/login.

\* Manage profile.

\* Manage addresses.

\* View orders.

\* View order details.

\* Access tracking information where available.



\---



\## 5.2 B2B Trade Customer



An approved business customer.



\### Primary capabilities



\* Access a trade account.

\* View customer-specific products/pricing.

\* Place standard orders.

\* Use quick ordering.

\* Order by SKU.

\* Enter bulk quantities.

\* Reorder previous purchases.

\* Save favourite products.

\* View invoices.

\* Manage company/account information.

\* Manage addresses.

\* Access account-specific ordering rules.



\---



\## 5.3 Sales Agent



A Gemjar sales representative.



\### Primary capabilities



\* Access assigned customers only.

\* Search assigned customers.

\* View customer profiles.

\* View customer order history.

\* View customer invoices.

\* See customer-specific catalogue and pricing.

\* Place orders on behalf of customers.

\* Reorder previous products.

\* Switch between assigned customers.

\* Have orders attributed to the agent.

\* Maintain activity/history records.



\---



\## 5.4 Internal/Admin User



Internal Gemjar operational users.



Access must depend on assigned permissions.



Potential permission areas include:



\* Products

\* Categories

\* Customers

\* B2B accounts

\* Sales agents

\* Pricing

\* Orders

\* Shipments

\* Integrations

\* Imports

\* Exports

\* Notifications

\* Analytics

\* User management

\* System settings

\* Audit history



The exact administration model should be finalized during discovery.



\---



\# 6. High-Level Product Architecture



```text

&#x20;                        GEMJAR COMMERCE PLATFORM

&#x20;                                  │

&#x20;                ┌─────────────────┼─────────────────┐

&#x20;                │                 │                 │

&#x20;                ▼                 ▼                 ▼

&#x20;             B2C STORE         B2B PORTAL      SALES AGENT

&#x20;                │                 │                 │

&#x20;                └─────────────────┼─────────────────┘

&#x20;                                  │

&#x20;                                  ▼

&#x20;                        CORE COMMERCE API

&#x20;                                  │

&#x20;         ┌──────────────┬─────────┼─────────┬──────────────┐

&#x20;         │              │         │         │              │

&#x20;         ▼              ▼         ▼         ▼              ▼

&#x20;      Products       Customers  Pricing   Orders       Fulfilment

&#x20;         │              │         │         │              │

&#x20;         └──────────────┴─────────┼─────────┴──────────────┘

&#x20;                                  │

&#x20;                                  ▼

&#x20;                             PostgreSQL

&#x20;                                  │

&#x20;                   ┌──────────────┴──────────────┐

&#x20;                   │                             │

&#x20;                   ▼                             ▼

&#x20;               Redis                         Job Queue

&#x20;                                                 │

&#x20;                                                 ▼

&#x20;                                       Integration Workers

&#x20;                                                 │

&#x20;                           ┌─────────────────────┼─────────────────────┐

&#x20;                           │                     │                     │

&#x20;                           ▼                     ▼                     ▼

&#x20;                        Mintsoft              Sage 50          Other Future

&#x20;                                                                   Systems

```



The architecture must maintain separation between the customer-facing commerce experience and the availability of external systems.



\---



\# 7. Functional Modules



The application will be divided into the following major domains:



1\. Authentication \& Authorization

2\. User Management

3\. Product Catalogue

4\. Categories \& Attributes

5\. Customer Management

6\. B2B Account Management

7\. Sales Agent Management

8\. Customer-Agent Assignment

9\. Customer-Specific Pricing

10\. B2C Commerce

11\. B2B Ordering

12\. Sales Agent Ordering

13\. Shopping Basket

14\. Checkout

15\. Order Management

16\. Fulfilment \& Shipments

17\. Customer Order Timeline

18\. Intelligent Reordering

19\. Invoices

20\. Integration Centre

21\. Import Centre

22\. Export Centre

23\. Notifications

24\. Audit Trail

25\. Search \& Discovery

26\. Analytics \& Business Visibility

27\. Admin \& Operational Dashboard



\---



\# 8. Product Catalogue



\## 8.1 Objective



Provide a centralized product catalogue for all commerce channels.



The initial platform setup/migration is expected to support approximately \*\*500 SKUs\*\*.



\---



\## 8.2 Product Requirements



Each product must support, where applicable:



\* Unique internal identifier.

\* SKU.

\* Product name.

\* Product description.

\* Product status.

\* Category.

\* Subcategory.

\* Product attributes.

\* Product specifications.

\* Availability information.

\* Visibility controls.

\* Product images/media.

\* SEO metadata.

\* Structured product metadata.



\### Product Status



At minimum, the data model must support:



\* Active

\* Inactive



Additional statuses may be introduced if required during discovery.



\### Product Visibility



The system should support visibility controls allowing products to be available or unavailable to relevant experiences where business rules require it.



\---



\## 8.3 Product Management



Authorized users must be able to:



\* Create products.

\* Edit products.

\* Update SKUs.

\* Assign categories.

\* Assign attributes.

\* Update specifications.

\* Change product status.

\* Configure visibility.

\* Manage product availability information.

\* Import product data.

\* Export product data.



\---



\# 9. Categories \& Product Attributes



The platform must support:



\* Categories

\* Subcategories

\* Product attributes

\* Product specifications



The data structure should not hard-code all product attributes into fixed database columns.



A flexible attribute model should allow future product categories to support different specifications.



Example:



```text

Product

│

├── Category: Jewellery

│

├── Attribute: Material

│      └── Gold

│

├── Attribute: Weight

│      └── 20g

│

└── Attribute: Size

&#x20;      └── Medium

```



Exact Gemjar product taxonomy must be confirmed during discovery.



\---



\# 10. B2C Ecommerce



\## 10.1 Storefront



The B2C storefront must provide:



\* Modern Gemjar storefront.

\* Responsive/mobile-first design.

\* Product catalogue.

\* Categories.

\* Search.

\* Filtering.

\* Product detail pages.

\* Related products.

\* Recommended products.

\* Recently viewed products.

\* Quick-add to basket.

\* Stock availability indicators where data is available.



\---



\## 10.2 Product Detail Page



The product page should support:



\* Product name.

\* Product images.

\* Product description.

\* Product attributes/specifications.

\* Price.

\* Availability.

\* Quantity selection where applicable.

\* Add to basket.

\* Related products.

\* Recommended products.



Exact product page content will be determined during UX/UI design.



\---



\## 10.3 Shopping Basket



Requirements:



\* Add product.

\* Remove product.

\* Update quantity.

\* Persistent basket.

\* Basket total calculation.

\* VAT/tax handling where applicable.

\* Basket availability validation before checkout.



The exact guest basket persistence mechanism should be determined during technical implementation.



\---



\## 10.4 Checkout



The B2C checkout must support:



\* Customer identification/authentication as required.

\* Delivery address selection.

\* Payment integration.

\* Order review.

\* Order confirmation.



Payment provider specifics are not defined and must be confirmed during discovery.



\---



\## 10.5 B2C Customer Account



Customers must be able to:



\* Register.

\* Login.

\* Manage profile.

\* Manage addresses.

\* View order history.

\* View order details.

\* Access delivery/tracking information where available.



\---



\# 11. B2B Trade Portal



\## 11.1 Access



B2B functionality must be available to approved trade customers.



The exact account approval workflow is not fully defined and must be finalized during discovery.



\---



\## 11.2 B2B Dashboard



The dashboard must provide visibility into:



\* Recent orders.

\* Outstanding orders.

\* Recent purchases.

\* Frequently ordered products.

\* Products available to reorder.

\* New products.

\* Latest invoices.

\* Delivery/tracking updates where available.

\* Account information.



\---



\## 11.3 Advanced Ordering



The B2B ordering system must support:



\* Standard product ordering.

\* Quick order.

\* SKU-based ordering.

\* Bulk quantity entry.

\* One-click reorder.

\* Reordering previous orders.

\* Saved/favourite products.

\* Frequently ordered products.

\* Minimum order quantity validation.

\* Pack quantity validation.

\* Customer-specific pricing.

\* VAT calculation.

\* Order notes.

\* Order review before submission.



\---



\## 11.4 Quick Order



The Quick Order experience should allow efficient ordering without navigating multiple product pages.



Expected workflow:



```text

Search SKU/Product

&#x20;       ↓

Select Product

&#x20;       ↓

Enter Quantity

&#x20;       ↓

Validate MOQ

&#x20;       ↓

Validate Pack Quantity

&#x20;       ↓

Apply Customer Price

&#x20;       ↓

Add to Order

```



\---



\# 12. B2B Account Management



B2B users must have access to:



\* Company profile.

\* Contact information.

\* Multiple delivery addresses.

\* Billing address.

\* Order history.

\* Order details.

\* Invoice history.

\* Invoice access.

\* Reordering.

\* Saved products.

\* Account preferences.

\* Contact sales functionality.



\---



\# 13. Customer-Specific Pricing Engine



\## 13.1 Objective



Pricing must be determined based on the individual customer.



The same product may have different prices for different B2B customers.



Example:



| Customer   | Product   |  Price |

| ---------- | --------- | -----: |

| Customer A | Product X | £10.00 |

| Customer B | Product X |  £8.50 |

| Customer C | Product X |  £7.90 |



\---



\## 13.2 Pricing Requirements



The pricing system must support:



\* Customer-specific pricing.

\* Product-level customer pricing.

\* Bulk pricing rules where required.

\* Minimum order quantities.

\* Pack quantities.

\* VAT rules.

\* Pricing validation.

\* Customer-specific price visibility.

\* Pricing import.

\* Pricing export.

\* Pricing audit history.

\* Effective dates where required.



\---



\## 13.3 Pricing Resolution



A centralized Pricing Engine must be responsible for determining the applicable price.



Conceptual interface:



```text

calculatePrice(

&#x20;   customer,

&#x20;   product,

&#x20;   quantity,

&#x20;   orderDate

)

```



The result should contain sufficient information to support:



\* Unit price.

\* Quantity.

\* VAT.

\* Applied pricing rule where required.

\* Total.

\* Validation status.



The exact priority between multiple potential pricing rules must be defined during technical discovery.



\---



\## 13.4 Pricing Audit



Important pricing changes should create an audit record.



Suggested audit data:



\* Who changed the price.

\* Customer.

\* Product.

\* Previous price.

\* New price.

\* Effective date.

\* Change timestamp.



\---



\# 14. Sales Agent Portal



\## 14.1 Agent Dashboard



The sales-agent dashboard must support:



\* Recent orders.

\* New customers.

\* New products.

\* Outstanding customer orders.

\* Reorder opportunities.

\* Recently active customers.

\* Recent invoices.

\* Customer purchasing activity.



\---



\## 14.2 Assigned Customers



Each sales agent must have access to their assigned customers only unless explicitly authorized otherwise.



The platform must support:



\* Customer assignment.

\* Assigned customer list.

\* Customer search.

\* Customer profile access.

\* Customer order history.

\* Customer invoices.

\* Customer-specific catalogue.

\* Customer-specific pricing.



\---



\## 14.3 Customer Switching



A sales agent must be able to select an assigned customer before creating an order.



Example:



```text

Agent Login

&#x20;    ↓

Select Customer

&#x20;    ↓

Customer Context Activated

&#x20;    ↓

Load Customer Catalogue

&#x20;    ↓

Load Customer Pricing

&#x20;    ↓

Create Order

```



The customer context must be clearly visible in the interface to reduce the risk of an agent placing an order against the wrong customer.



\---



\## 14.4 Sales Agent Order Builder



The order builder must support:



1\. Select customer.

2\. Search products.

3\. Add quantities.

4\. Automatically apply customer pricing.

5\. Validate pack quantities.

6\. Validate MOQs.

7\. Calculate VAT.

8\. Calculate totals.

9\. Confirm order.

10\. Attribute order to both customer and agent.



\---



\# 15. Customer-Agent Assignment



The system must support the relationship:



```text

Sales Agent

&#x20;     │

&#x20;     ├── Customer A

&#x20;     ├── Customer B

&#x20;     └── Customer C

```



The database must support assignment and reassignment.



Suggested data:



\* Agent ID.

\* Customer ID.

\* Assignment status.

\* Assignment date.

\* Assigned by.

\* Historical changes if required.



\---



\# 16. Order Management



\## 16.1 Unified Order Model



Orders from all channels must be stored in one central order system.



Order sources include:



\* B2C

\* B2B

\* Sales Agent



\---



\## 16.2 Order Data



Each order should support:



\### Core



\* Order ID.

\* Order number.

\* Order source.

\* Customer.

\* Customer contact details as required.

\* Billing address.

\* Delivery address.

\* Order items.

\* Quantities.

\* Unit prices.

\* VAT.

\* Totals.

\* Order notes.



\### Attribution



\* Sales agent ID where applicable.

\* Customer ID.

\* Order creator/user.



\### Fulfilment



\* Fulfilment status.

\* Shipment records.

\* Tracking information.

\* Partial shipment status.



\### Operational



\* Creation timestamp.

\* Modification timestamp.

\* Cancellation status.

\* Return status.

\* Integration status.



\---



\## 16.3 Order Source



The system must explicitly identify the order origin.



Suggested values:



```text

B2C

B2B

SALES\_AGENT

ADMIN

```



Additional sources may be introduced later.



\---



\## 16.4 Order History



Orders must maintain historical visibility.



The platform must support:



\* Order history.

\* Detailed order views.

\* Customer order timeline.

\* Status history.



\---



\# 17. Order Status \& Timeline



The platform requires a visual fulfilment timeline.



Example:



```text

Order Placed

&#x20;     ↓

Confirmed

&#x20;     ↓

Processing

&#x20;     ↓

Partially Dispatched

&#x20;     ↓

Dispatched

&#x20;     ↓

Delivered

```



External fulfilment and tracking information should be incorporated where available.



\---



\## 17.1 Important Note



The exact final order state machine is not fully defined in the source document.



Therefore, implementation must not permanently hard-code assumptions without discovery.



The initial state model should remain extensible.



\---



\# 18. Fulfilment \& Partial Shipments



\## 18.1 Core Requirement



Partial shipments are explicitly identified as a \*\*core requirement\*\*, not an edge case.



\---



\## 18.2 Data Model



The architecture must support:



```text

Order

&#x20;│

&#x20;├── Order Item A

&#x20;├── Order Item B

&#x20;└── Order Item C

&#x20;       │

&#x20;       ▼

&#x20;  Multiple Shipments

&#x20;       │

&#x20;       ├── Shipment 1

&#x20;       │      ├── Item A: 10

&#x20;       │      └── Item B: 5

&#x20;       │

&#x20;       └── Shipment 2

&#x20;              ├── Item B: Remaining

&#x20;              └── Item C

```



An order must not be limited to a single shipment.



\---



\## 18.3 Shipment Requirements



Each shipment should support:



\* Shipment ID.

\* Parent order.

\* Shipment status.

\* Shipment items.

\* Quantity per item.

\* Dispatch status.

\* Tracking information.

\* External fulfilment reference where available.

\* Creation timestamp.

\* Update timestamp.



The source document also requires:



\* Shipment-level status.

\* Partial shipment support.

\* Tracking information.



\---



\# 19. Intelligent Reordering



The platform must support:



\* Reorder a previous order.

\* Reorder individual products.

\* Frequently ordered products.

\* Saved products.

\* Quick order.

\* Automatic application of customer-specific pricing.

\* Previous order visibility.



\---



\# 20. Shopping Baskets \& Order Drafts



The B2C experience requires a persistent basket.



B2B and agent workflows should support an order-building experience.



The exact persistence requirements for B2B order drafts should be confirmed during discovery.



Recommended support:



\* Create draft.

\* Add item.

\* Update quantity.

\* Remove item.

\* Validate rules.

\* Review totals.

\* Submit order.



\---



\# 21. Invoice Management



The platform must support invoice history and invoice access for B2B customers.



The source document specifically identifies:



\* Latest invoices.

\* Customer invoices.

\* Invoice history.

\* Invoice access.

\* Invoice references in integration/data exchange.



The following remain TBD:



\* Whether invoices originate in Sage 50 or another system.

\* Whether Gemjar generates invoices directly.

\* Whether invoice PDFs are stored.

\* Whether invoice data is synchronized or imported.



\---



\# 22. Integration \& Data Exchange Centre



\## 22.1 Objective



The platform must include an integration and data-exchange layer.



Sage 50 and Mintsoft must be connected where appropriate but must not become foundational dependencies.



\---



\## 22.2 Integration Dashboard



Authorized users must be able to view:



\* Integration status.

\* Last successful synchronization.

\* Failed synchronizations.

\* Pending synchronizations.

\* Import history.

\* Export history.

\* Error messages.

\* Retry status.



\---



\## 22.3 Supported Data Exchange Areas



The architecture must support exchange of:



\* Products.

\* Customers.

\* Pricing.

\* Orders.

\* Stock.

\* Shipments.

\* Tracking.

\* Invoice references.



\---



\# 23. Integration Architecture



Integrations must be implemented through dedicated adapters/services.



Recommended conceptual architecture:



```text

Core Platform

&#x20;     │

&#x20;     ▼

Integration Interface

&#x20;     │

&#x20;┌────┴───────────┐

&#x20;│                │

&#x20;▼                ▼

Mintsoft       Sage 50

Adapter        Adapter

```



The core order/product/customer services must not directly depend on provider-specific implementation logic.



Future systems should be connectable through new adapters.



Potential abstractions:



\* Inventory Provider

\* Order Synchronization Provider

\* Customer Synchronization Provider

\* Pricing Synchronization Provider

\* Shipment Provider

\* Invoice Provider



\---



\# 24. Integration Resilience



The platform must support:



\* Integration logs.

\* Failed transaction tracking.

\* Retry processing.

\* Duplicate prevention.

\* Data validation.

\* Synchronization status.

\* Error reporting.

\* Background processing.

\* Separation of customer-facing functionality from external system availability.



\---



\## 24.1 Failure Handling



Example:



```text

Order Created

&#x20;     ↓

Integration Job Created

&#x20;     ↓

External API Call

&#x20;     │

&#x20;     ├── Success → Mark Synchronized

&#x20;     │

&#x20;     └── Failure

&#x20;             ↓

&#x20;          Log Error

&#x20;             ↓

&#x20;            Retry

&#x20;             ↓

&#x20;      Retry Limit Reached

&#x20;             ↓

&#x20;       Mark as Failed

&#x20;             ↓

&#x20;       Alert Authorized User

```



Exact retry strategy must be finalized during implementation.



\---



\# 25. Background Job System



Background processing is required for:



\* Synchronization.

\* Retries.

\* Scheduled processing.

\* Import processing.

\* Export processing.

\* Notification processing where appropriate.



The source architecture explicitly specifies asynchronous synchronization, retries and scheduled processing.



\---



\# 26. Import Centre



The system must support structured data upload.



\## 26.1 Import Requirements



\* File upload.

\* Structured data processing.

\* Pre-import validation.

\* Error reporting.

\* Review before commit.

\* Import history.

\* Duplicate detection.

\* Field validation.

\* Data validation.



\---



\## 26.2 Potential Import Types



The architecture must support imports for:



\* Products.

\* Customers.

\* Pricing.

\* Other supported business data.



Exact formats and mappings must be confirmed during technical discovery.



\---



\## 26.3 Import Workflow



```text

Upload File

&#x20;     ↓

Parse File

&#x20;     ↓

Validate Structure

&#x20;     ↓

Validate Fields

&#x20;     ↓

Detect Errors

&#x20;     ↓

Display Review

&#x20;     ↓

User Confirms

&#x20;     ↓

Commit Import

&#x20;     ↓

Store Import History

```



Invalid records should be clearly identifiable.



\---



\# 27. Export Centre



The system must support:



\* Structured order exports.

\* Product exports.

\* Customer exports.

\* Pricing exports.

\* Stock-related exports.

\* Shipment information exports.

\* CSV.

\* Excel-compatible formats where appropriate.

\* System-specific formats where technically supported.



\---



\# 28. Notifications \& Operational Alerts



The platform must support notifications for:



\* New orders.

\* Order status changes.

\* Partial shipment events.

\* Dispatch events.

\* Tracking updates.

\* New B2B account applications.

\* New customers.

\* Integration failures.

\* Import failures.

\* Stock-related alerts where appropriate.



\---



\## 28.1 Notification Channels



The source document does not define channels.



Therefore, the following are \*\*TBD\*\*:



\* Email.

\* In-app notification.

\* SMS.

\* Push notification.



The system architecture should allow additional notification channels in the future.



\---



\# 29. Audit Trail



The platform must record important activity.



Required audit areas include:



\* Customer creation.

\* Customer updates.

\* Pricing changes.

\* Order creation.

\* Order modification.

\* Agent order attribution.

\* Import activity.

\* Export activity.

\* Integration activity.

\* Administrative changes.

\* User/activity history.



\---



\## 29.1 Recommended Audit Record



Each audit record should contain:



\* Audit ID.

\* Event type.

\* Entity type.

\* Entity ID.

\* User/system actor.

\* Timestamp.

\* Relevant previous values where appropriate.

\* Relevant new values where appropriate.

\* Metadata/context.



Sensitive data must not be unnecessarily stored in audit logs.



\---



\# 30. Authentication



The platform must provide authentication for relevant users.



At minimum:



\* Consumer registration/login.

\* B2B user login.

\* Sales agent login.

\* Internal/admin user login.



The exact authentication provider and account recovery requirements are not specified in the source document and require confirmation.



\---



\# 31. Authorization \& Role-Based Access Control



The system must enforce access according to role and assigned permissions.



\## 31.1 Consumer



Can access:



\* Their account.

\* Their addresses.

\* Their orders.

\* Their permitted information.



\## 31.2 B2B Customer



Can access:



\* Their trade account.

\* Applicable pricing.

\* Orders.

\* Invoices.

\* Associated account information.



\## 31.3 Sales Agent



Can access:



\* Assigned customers.

\* Associated customer information.

\* Customer orders.

\* Customer invoices.

\* Customer-specific pricing.

\* Order creation on behalf of customers.



They must not access unassigned customers unless explicitly authorized.



\## 31.4 Internal/Admin



Access must be controlled by assigned permissions.



\---



\# 32. Search \& Discovery



The platform must support:



\## B2C



Search by:



\* Product.

\* SKU.

\* Category.

\* Relevant attributes.



\## B2B



Search across:



\* Customer's available catalogue.



\## Sales Agent



Search by:



\* Customer.

\* Product.

\* SKU.

\* Order.



The platform must also support:



\* Advanced filtering.

\* Mobile-friendly search.



\---



\# 33. Analytics \& Business Visibility



The platform must provide dashboard visibility into appropriate metrics.



Indicative metrics include:



\* B2C orders.

\* B2C revenue.

\* Top-selling products.

\* B2B order activity.

\* Top customers.

\* Frequently ordered products.

\* Orders by sales agent.

\* Customer activity by agent.

\* Pending orders.

\* Partially shipped orders.

\* Dispatch status.

\* Integration failures.



The exact KPI definitions and reporting depth must be confirmed during discovery.



\---



\# 34. Responsive \& Mobile Requirements



The application must provide:



\* Responsive B2C storefront.

\* Mobile-friendly B2B ordering.

\* Mobile-friendly sales-agent workflows.

\* Touch-friendly controls.

\* Optimized layouts.

\* Desktop support.

\* Tablet support.

\* Mobile support.

\* Consistent experience across devices.



\---



\# 35. SEO Requirements



The B2C storefront must provide SEO foundations including:



\* Search-engine-friendly architecture.

\* Product metadata.

\* Clean URLs.

\* Semantic page structure.

\* Optimized product pages.

\* Responsive implementation.



\---



\# 36. Performance Requirements



The source document requires performance-conscious development.



Implementation principles should include:



\* Server-side rendering where appropriate.

\* Static generation where appropriate.

\* Optimized images.

\* Database indexing.

\* Efficient API queries.

\* Caching where appropriate.

\* Background processing for long-running tasks.

\* Pagination for large datasets.

\* Avoidance of unnecessary client-side rendering.



Specific performance targets should be defined during discovery.



\---



\# 37. Technical Architecture



\## 37.1 Frontend



\### Technology



\* Next.js

\* TypeScript

\* Tailwind CSS

\* shadcn/ui

\* Framer Motion where appropriate



The source scope proposes Next.js 15 specifically.



\---



\## 37.2 Recommended Frontend Supporting Libraries



Recommended implementation choices:



\* TanStack Query — server state and caching.

\* Zustand — lightweight client state.

\* React Hook Form — complex forms.

\* Zod — validation.

\* TanStack Table — advanced admin tables where needed.



These are implementation recommendations and are not explicitly mandated by the source document.



\---



\# 38. Backend



\## Technology



\* NestJS

\* TypeScript

\* REST API

\* OpenAPI/Swagger



NestJS is the proposed backend technology in the source scope.



\---



\# 39. Database



\## Primary Database



\*\*PostgreSQL\*\*



Primary responsibilities:



\* Commerce data.

\* Customers.

\* Products.

\* Pricing.

\* Orders.

\* Shipments.

\* User relationships.

\* Audit data.

\* Integration records.



PostgreSQL is the specified core commerce and operational data store in the source architecture.



\---



\# 40. ORM



Recommended:



\*\*Prisma\*\*



Reasons:



\* Type safety.

\* Schema management.

\* Developer productivity.

\* TypeScript integration.



This is an implementation recommendation rather than a client-specified requirement.



The ORM decision should remain flexible until project initialization.



\---



\# 41. Cache \& Queue Infrastructure



Recommended:



\*\*Redis\*\*



Primary responsibilities:



\* Caching.

\* Rate limiting.

\* Queue infrastructure.

\* Background job coordination.



Recommended queue system:



\*\*BullMQ\*\*



Primary responsibilities:



\* Integration synchronization.

\* Retry processing.

\* Scheduled jobs.

\* Import processing.

\* Export processing.

\* Notifications.



\---



\# 42. File Storage



The system requires storage capability for:



\* Product images.

\* Import files.

\* Export files where retained.

\* Invoice documents where applicable.

\* Other business documents where required.



Recommended architecture:



\*\*S3-compatible object storage\*\*



Provider selection is TBD.



\---



\# 43. Monorepo Structure



Recommended architecture:



```text

gemjar-platform/

│

├── apps/

│   │

│   ├── web/

│   │   └── Next.js

│   │

│   ├── api/

│   │   └── NestJS

│   │

│   └── worker/

│       └── Background Jobs

│

├── packages/

│   │

│   ├── ui/

│   ├── types/

│   ├── validation/

│   ├── config/

│   └── utils/

│

├── infrastructure/

│

├── docs/

│

└── docker/

```



A monorepo is recommended to encourage:



\* Shared types.

\* Shared validation.

\* Shared utilities.

\* Consistent tooling.



\---



\# 44. Backend Module Architecture



```text

src/

│

├── auth/

├── users/

├── roles/

├── permissions/

│

├── products/

├── categories/

├── attributes/

│

├── customers/

├── b2b/

├── agents/

│

├── pricing/

│

├── carts/

├── orders/

├── fulfilment/

├── shipments/

├── invoices/

│

├── payments/

│

├── integrations/

│   ├── mintsoft/

│   ├── sage/

│   └── common/

│

├── imports/

├── exports/

│

├── notifications/

├── audit/

├── analytics/

│

└── common/

```



The final module structure may evolve, but business domains should remain separated.



\---



\# 45. Database Core Entities



The following entities are expected.



\## Identity



\* User

\* Role

\* Permission

\* UserRole

\* RolePermission

\* Session/Refresh Token as required



\## Product



\* Product

\* Category

\* ProductCategory

\* ProductAttribute

\* ProductAttributeValue

\* ProductMedia



\## Customer



\* Customer

\* CustomerUser

\* CustomerAddress

\* B2BAccount



\## Sales Agent



\* SalesAgent

\* AgentCustomerAssignment



\## Pricing



\* PricingRule

\* CustomerProductPrice

\* PricingHistory



\## Commerce



\* Cart

\* CartItem

\* Order

\* OrderItem

\* OrderStatusHistory



\## Fulfilment



\* Shipment

\* ShipmentItem

\* TrackingEvent where required



\## Financial



\* InvoiceReference

\* PaymentRecord where applicable



\## Integration



\* Integration

\* IntegrationSync

\* IntegrationJob

\* IntegrationError

\* ImportJob

\* ExportJob



\## Notifications



\* Notification

\* NotificationPreference where required



\## Audit



\* AuditLog



Exact schemas must be refined during database design.



\---



\# 46. Critical Business Rules



The following business rules are central to the platform.



\## BR-01 — Customer-specific pricing



A B2B customer may see a different price from another customer for the same product.



\## BR-02 — Agent access restriction



An agent may only access assigned customers unless explicitly authorized.



\## BR-03 — Agent order attribution



Orders placed by agents must retain:



\* Customer attribution.

\* Agent attribution.



\## BR-04 — MOQ validation



Orders must be validated against minimum order quantities where applicable.



\## BR-05 — Pack quantity validation



Orders must comply with required pack quantities where applicable.



\## BR-06 — VAT calculation



VAT must be calculated according to the applicable configured rules.



\## BR-07 — Partial shipments



An order may contain multiple shipments.



\## BR-08 — Order data preservation



Historical order pricing must remain accurate even if current product pricing later changes.



\## BR-09 — Integration independence



Core customer-facing functionality must not become unavailable solely because Sage 50 or Mintsoft is temporarily unavailable.



\## BR-10 — Duplicate prevention



Integration and import processes must protect against unintended duplicate processing.



\## BR-11 — Auditability



Important changes must be traceable.



\---



\# 47. API Requirements



The backend must expose a structured API for frontend and external integrations.



Recommended endpoint groups:



```text

/api/auth

/api/users

/api/products

/api/categories

/api/customers

/api/b2b

/api/agents

/api/pricing

/api/cart

/api/orders

/api/shipments

/api/invoices

/api/integrations

/api/imports

/api/exports

/api/notifications

/api/analytics

/api/admin

```



All APIs should:



\* Validate input.

\* Enforce authorization.

\* Return predictable error structures.

\* Support pagination where required.

\* Avoid exposing unauthorized data.

\* Be documented using OpenAPI.



\---



\# 48. Example Key API Areas



\## Products



```text

GET    /products

GET    /products/:id

POST   /products

PATCH  /products/:id

DELETE /products/:id

```



\## Customers



```text

GET    /customers

GET    /customers/:id

POST   /customers

PATCH  /customers/:id

```



\## Pricing



```text

GET    /pricing/customer/:customerId

POST   /pricing

PATCH  /pricing/:id

```



\## Orders



```text

GET    /orders

GET    /orders/:id

POST   /orders

PATCH  /orders/:id

```



\## Shipments



```text

GET    /orders/:orderId/shipments

POST   /orders/:orderId/shipments

PATCH  /shipments/:id

```



Actual endpoint naming should be finalized during API design.



\---



\# 49. Security Requirements



The platform must implement:



\* Authentication.

\* Role-based authorization.

\* Resource-level access validation.

\* Secure password handling.

\* Secure session/token handling.

\* Input validation.

\* API rate limiting where appropriate.

\* Protection against unauthorized data access.

\* Audit logging.

\* Secure secrets management.

\* HTTPS in production.



Sales-agent customer access must always be validated server-side.



Client-side route protection alone is not sufficient.



\---



\# 50. Integration Security



External integration credentials must:



\* Never be exposed to the frontend.

\* Be stored securely.

\* Be environment-specific.

\* Support rotation where possible.



Integration logs must avoid unnecessarily exposing credentials or sensitive information.



\---



\# 51. Error Handling



The application must provide:



\* User-friendly frontend errors.

\* Structured backend errors.

\* Validation errors.

\* Integration errors.

\* Import errors.

\* Retry information.

\* Internal logging.



Administrative users should have sufficient information to investigate failures without exposing sensitive internal stack traces to regular users.



\---



\# 52. Testing Strategy



\## 52.1 Unit Testing



Test:



\* Pricing calculations.

\* VAT calculations.

\* MOQ validation.

\* Pack quantity validation.

\* Permission checks.

\* Status transitions.

\* Integration mapping.



Recommended:



\*\*Vitest or Jest\*\*



\---



\## 52.2 Integration Testing



Test:



\* Database interactions.

\* API workflows.

\* Authentication.

\* Authorization.

\* Order creation.

\* Shipment creation.

\* Pricing application.



\---



\## 52.3 End-to-End Testing



Recommended:



\*\*Playwright\*\*



Critical scenarios:



\### Scenario 1



```text

B2C Customer

→ Browse Product

→ Add to Basket

→ Checkout

→ Payment

→ Order Confirmation

```



\### Scenario 2



```text

B2B Customer

→ Login

→ See Customer Price

→ Add Product

→ MOQ Validation

→ Pack Validation

→ Submit Order

```



\### Scenario 3



```text

Sales Agent

→ Login

→ Select Assigned Customer

→ See Customer Pricing

→ Create Order

→ Order Attributed to Agent

```



\### Scenario 4



```text

Order

→ Partial Shipment

→ Status Updated

→ Remaining Quantity Pending

→ Final Shipment

→ Order Completed

```



\### Scenario 5



```text

Integration Failure

→ Failure Logged

→ Retry

→ Successful Synchronization

```



\---



\# 53. Performance \& Scalability Strategy



The initial architecture should use a modular monolith.



The recommended approach is:



> \*\*Modular Monolith + Dedicated Background Workers\*\*



Do not begin with unnecessary microservices.



The architecture should remain modular enough that individual high-load domains can be separated later if business scale requires it.



Potential future separation candidates:



\* Search.

\* Integrations.

\* Notifications.

\* Analytics.

\* Background processing.



\---



\# 54. Search Strategy



Because the initial catalogue is approximately 500 SKUs, the initial implementation does not necessarily require a dedicated search engine.



Recommended initial approach:



\* PostgreSQL search.

\* Indexed search fields.

\* SKU search.

\* Category filtering.

\* Attribute filtering.



The architecture should allow future migration to a dedicated search system if requirements grow.



\---



\# 55. Deployment Architecture



Recommended production architecture:



```text

&#x20;                   Internet

&#x20;                      │

&#x20;                      ▼

&#x20;               CDN / Load Balancer

&#x20;                      │

&#x20;           ┌──────────┴──────────┐

&#x20;           │                     │

&#x20;           ▼                     ▼

&#x20;       Next.js                NestJS API

&#x20;                                     │

&#x20;                        ┌────────────┼────────────┐

&#x20;                        │            │            │

&#x20;                        ▼            ▼            ▼

&#x20;                   PostgreSQL      Redis        Storage

&#x20;                                     │

&#x20;                                     ▼

&#x20;                                  Workers

&#x20;                                     │

&#x20;                                     ▼

&#x20;                             External Systems

```



Recommended infrastructure capabilities:



\* Containerized deployment.

\* Managed PostgreSQL.

\* Managed Redis.

\* Object storage.

\* Automated backups.

\* Environment separation.

\* Monitoring.

\* Error tracking.



\---



\# 56. Environments



At minimum:



```text

Development

&#x20;   ↓

Staging

&#x20;   ↓

Production

```



Each environment must maintain separate:



\* Database.

\* Redis.

\* API credentials.

\* Integration configuration.

\* Storage configuration.

\* Environment secrets.



\---



\# 57. CI/CD Requirements



The project should implement automated:



\* Dependency installation.

\* Linting.

\* Type checking.

\* Unit testing.

\* Build verification.

\* Deployment where approved.



Recommended:



\*\*GitHub Actions\*\*



\---



\# 58. Monitoring \& Observability



Recommended:



\* Application error tracking.

\* API monitoring.

\* Worker monitoring.

\* Integration monitoring.

\* Queue monitoring.

\* Database monitoring.

\* Structured logs.



Recommended implementation:



\* Sentry for application errors.

\* Structured logging.

\* OpenTelemetry-compatible observability where appropriate.



These are implementation recommendations.



\---



\# 59. UX/UI Requirements



The UX design phase must define:



\* Information architecture.

\* B2C journeys.

\* B2B journeys.

\* Sales-agent journeys.

\* Admin workflows.

\* Responsive layouts.

\* Ordering workflows.

\* Dashboards.



The source scope specifically includes a dedicated UX/UI and portal mapping phase for these workflows.



\---



\# 60. Primary User Journeys



\## Journey 1 — B2C Purchase



```text

Visit Store

&#x20;    ↓

Browse/Search

&#x20;    ↓

View Product

&#x20;    ↓

Add to Basket

&#x20;    ↓

Checkout

&#x20;    ↓

Payment

&#x20;    ↓

Order Created

&#x20;    ↓

Order Confirmation

&#x20;    ↓

Tracking/Delivery Updates

```



\---



\## Journey 2 — B2B Purchase



```text

Login

&#x20;    ↓

View Dashboard

&#x20;    ↓

Search/Quick Order

&#x20;    ↓

Customer Price Applied

&#x20;    ↓

Enter Quantity

&#x20;    ↓

Validate MOQ

&#x20;    ↓

Validate Pack Quantity

&#x20;    ↓

Review Order

&#x20;    ↓

Submit

&#x20;    ↓

Order Created

```



\---



\## Journey 3 — Sales Agent Order



```text

Login

&#x20;    ↓

View Assigned Customers

&#x20;    ↓

Select Customer

&#x20;    ↓

Load Customer Pricing

&#x20;    ↓

Search Products

&#x20;    ↓

Add Products

&#x20;    ↓

Validate Rules

&#x20;    ↓

Review

&#x20;    ↓

Submit

&#x20;    ↓

Order Attributed to Customer + Agent

```



\---



\# 61. Admin Dashboard



The central operational dashboard should provide visibility into:



\* Orders.

\* Customers.

\* Products.

\* B2B activity.

\* Sales-agent activity.

\* Pending orders.

\* Partially shipped orders.

\* Dispatch status.

\* Integration health.

\* Failed synchronization.



Exact dashboard design and KPIs remain subject to discovery.



\---



\# 62. Delivery Phases



The source document proposes the following delivery approach.



\## Phase 1 — Discovery \& Architecture



\*\*Indicative duration: 2 weeks\*\*



Activities:



\* Business rules.

\* Data ownership.

\* Sage 50 validation.

\* Mintsoft validation.

\* Integration strategy.

\* Import/export requirements.



\---



\## Phase 2 — UX/UI \& Portal Mapping



\*\*Indicative duration: 3 weeks\*\*



Activities:



\* B2C journeys.

\* B2B journeys.

\* Sales-agent journeys.

\* Dashboards.

\* Ordering workflows.

\* Responsive layouts.



\---



\## Phase 3 — Core Platform



\*\*Indicative duration: 3–4 weeks\*\*



Activities:



\* Database.

\* Backend.

\* Authentication.

\* Permissions.

\* Products.

\* Customers.

\* Pricing.

\* Orders.



\---



\## Phase 4 — Commerce Experiences



\*\*Indicative duration: 3 weeks\*\*



Activities:



\* B2C storefront.

\* Checkout.

\* Accounts.

\* B2B portal.

\* Sales-agent workflows.



\---



\## Phase 5 — Integration \& Data Exchange



\*\*Indicative duration: 3–4 weeks\*\*



Activities:



\* API integrations.

\* Import/export.

\* Data mapping.

\* Synchronization.

\* Logging.

\* Retries.



\---



\## Phase 6 — QA \& UAT



\*\*Indicative duration: 3 weeks\*\*



Activities:



\* Functional testing.

\* Integration testing.

\* Responsive testing.

\* Security testing.

\* User acceptance testing.



\---



\## Phase 7 — Launch \& Stabilisation



\*\*Indicative duration: 1 week\*\*



Activities:



\* Production deployment.

\* Final migration.

\* Verification.

\* Initial monitoring.



\---



\*\*Indicative overall delivery: 18–22 weeks.\*\*



Some phases may run concurrently.



The final schedule depends on technical discovery and validation of third-party systems.



\---



\# 63. Recommended Development Order



For implementation, I recommend the following sequence.



\## Sprint 0 — Project Foundation



\* Monorepo setup.

\* Next.js setup.

\* NestJS setup.

\* PostgreSQL.

\* Prisma.

\* Redis.

\* Docker.

\* Environment configuration.

\* CI/CD.

\* Shared packages.



\---



\## Sprint 1 — Identity \& Permissions



\* Authentication.

\* Users.

\* Roles.

\* Permissions.

\* Consumer access.

\* B2B access.

\* Agent access.

\* Admin access.



\---



\## Sprint 2 — Product Foundation



\* Products.

\* Categories.

\* Attributes.

\* SKU management.

\* Product visibility.

\* Product search foundation.



\---



\## Sprint 3 — Customer \& B2B Foundation



\* Customers.

\* B2B accounts.

\* Addresses.

\* Customer-user relationships.

\* Customer preferences.



\---



\## Sprint 4 — Sales Agents



\* Agent management.

\* Customer assignment.

\* Customer restrictions.

\* Agent dashboard foundation.



\---



\## Sprint 5 — Pricing Engine



\* Customer-specific pricing.

\* Product pricing.

\* Bulk rules.

\* MOQ.

\* Pack quantities.

\* VAT.

\* Pricing history.



This should be thoroughly tested before commerce UI development.



\---



\## Sprint 6 — Order Engine



\* Cart/order drafts.

\* Order creation.

\* Order items.

\* Totals.

\* VAT.

\* Order source.

\* Agent attribution.

\* Status history.



\---



\## Sprint 7 — Fulfilment



\* Shipments.

\* Shipment items.

\* Partial shipments.

\* Tracking.

\* Order timeline.



\---



\## Sprint 8 — B2C Experience



\* Storefront.

\* Catalogue.

\* Search.

\* Product pages.

\* Basket.

\* Checkout.

\* Customer account.



\---



\## Sprint 9 — B2B Portal



\* Dashboard.

\* Quick order.

\* SKU ordering.

\* Reorder.

\* Saved products.

\* Invoices.



\---



\## Sprint 10 — Sales Agent Portal



\* Assigned customers.

\* Customer switching.

\* Order builder.

\* Customer pricing.

\* Agent attribution.



\---



\## Sprint 11 — Integration Centre



\* Integration architecture.

\* Mintsoft adapter.

\* Sage 50 adapter.

\* Synchronization.

\* Logs.

\* Retries.

\* Error handling.



\---



\## Sprint 12 — Import/Export



\* CSV import.

\* Validation.

\* Preview.

\* Duplicate detection.

\* Export generation.

\* History.



\---



\## Sprint 13 — Notifications \& Audit



\* Notification infrastructure.

\* Operational alerts.

\* Audit logging.



\---



\## Sprint 14 — Analytics \& Admin



\* Dashboards.

\* Metrics.

\* Operational visibility.

\* Integration monitoring.



\---



\## Sprint 15 — QA, Security \& UAT



\* End-to-end testing.

\* Permission testing.

\* Integration testing.

\* Responsive testing.

\* Performance testing.

\* UAT fixes.



\---



\# 64. Critical Discovery Questions



Before final implementation begins, these questions must be answered.



\## Sage 50



1\. Which version of Sage 50 is being used?

2\. Is API access available?

3\. What data must move between Sage and Gemjar?

4\. Which system owns customer data?

5\. Which system owns invoice data?

6\. What synchronization frequency is required?

7\. Is synchronization real-time or scheduled?

8\. How are failures handled currently?



\---



\## Mintsoft



1\. What Mintsoft APIs are available?

2\. Which data is authoritative in Mintsoft?

3\. Is Mintsoft the definitive stock source?

4\. How frequently should stock synchronize?

5\. How are partial shipments represented?

6\. What shipment/tracking data is available?

7\. Are webhooks available?

8\. What authentication method is required?



The scope currently assumes Mintsoft is the definitive stock source, subject to the agreed future architecture.



\---



\## B2B



1\. How are trade customers approved?

2\. Can one company have multiple users?

3\. Who manages customer-specific pricing?

4\. Can customers have multiple pricing rules?

5\. How should pricing conflicts be resolved?

6\. Are prices tax-inclusive or tax-exclusive?

7\. What are the MOQ rules?

8\. What are the pack quantity rules?



\---



\## Sales Agents



1\. Can a customer have multiple agents?

2\. Can agents transfer customers?

3\. Can managers view all agents?

4\. Is commission tracking required?

5\. Are agents allowed to modify existing orders?

6\. Can agents access all invoices for assigned customers?



Commission functionality is not explicitly included in the current source scope.



\---



\## Orders



1\. What is the exact order status lifecycle?

2\. Can orders be edited after submission?

3\. Who can cancel orders?

4\. What are the cancellation rules?

5\. What are the return rules?

6\. How are partial shipments completed?

7\. Can one order have multiple tracking numbers?



\---



\## Payments



1\. Which payment provider will be used?

2\. Are B2B customers required to pay online?

3\. Are credit accounts supported?

4\. Are purchase orders supported?

5\. Is payment captured immediately or later?

6\. Are refunds required?



Payment-provider specifics are explicitly still to be finalized.



\---



\# 65. Acceptance Criteria



The project should not be considered complete until the following core criteria are satisfied.



\## Product



\* \[ ] Products can be created and managed.

\* \[ ] Approximately 500 initial SKUs can be migrated/setup.

\* \[ ] Products support categories and attributes.

\* \[ ] Product visibility can be controlled.



\## B2C



\* \[ ] Customers can browse products.

\* \[ ] Customers can search and filter.

\* \[ ] Customers can manage a basket.

\* \[ ] Customers can checkout.

\* \[ ] Customers can access their order history.



\## B2B



\* \[ ] Approved customers can access the B2B portal.

\* \[ ] Customers see applicable customer-specific prices.

\* \[ ] MOQ validation works.

\* \[ ] Pack validation works.

\* \[ ] Customers can reorder.

\* \[ ] Customers can access invoice history where available.



\## Sales Agents



\* \[ ] Agents can only access assigned customers.

\* \[ ] Agents can switch between authorized customers.

\* \[ ] Agents see customer-specific pricing.

\* \[ ] Agent-created orders retain agent attribution.



\## Orders



\* \[ ] Orders from all channels use the central order model.

\* \[ ] Order history is retained.

\* \[ ] Partial shipments are supported.

\* \[ ] Shipment-level statuses are supported.

\* \[ ] Tracking information can be stored.



\## Integrations



\* \[ ] Integration status is visible.

\* \[ ] Synchronization failures are logged.

\* \[ ] Failed processes can be retried.

\* \[ ] Duplicate prevention is implemented.

\* \[ ] External system failure does not unnecessarily disable customer-facing functionality.



\## Import/Export



\* \[ ] Structured imports are supported.

\* \[ ] Data validation occurs before commit.

\* \[ ] Import errors are reported.

\* \[ ] Import history is retained.

\* \[ ] Supported exports can be generated.



\## Security



\* \[ ] Role-based access is enforced server-side.

\* \[ ] Agents cannot access unauthorized customers.

\* \[ ] Customers cannot access other customer data.

\* \[ ] Administrative actions are restricted by permission.



\## Audit



\* \[ ] Pricing changes are auditable.

\* \[ ] Order changes are auditable.

\* \[ ] Import/export activity is auditable.

\* \[ ] Integration activity is auditable.



\---



\# 66. Risks



\## Risk 1 — Third-Party Integration Limitations



Sage 50 or Mintsoft may have limitations that affect:



\* API availability.

\* Data access.

\* Synchronization.

\* Rate limits.

\* Webhooks.

\* Data formats.



\*\*Mitigation:\*\* Validate integrations during Discovery.



\---



\## Risk 2 — Undefined Business Rules



Some important rules remain undefined, including:



\* Returns.

\* Cancellation.

\* Payment specifics.

\* Administration requirements.

\* Final data mappings.



\*\*Mitigation:\*\* Convert discovery outputs into a signed-off implementation specification before finalizing estimates.



\---



\## Risk 3 — Pricing Complexity



Customer-specific pricing can become highly complex.



\*\*Mitigation:\*\* Build a centralized pricing engine and establish explicit rule priority before implementation.



\---



\## Risk 4 — Partial Shipment Complexity



Partial shipments affect:



\* Order status.

\* Notifications.

\* Tracking.

\* Integration.

\* Customer communication.



\*\*Mitigation:\*\* Treat shipments as first-class entities rather than simple fields on orders.



\---



\# 67. Final Architecture Principles



The development team must follow these principles.



\### Principle 1



\*\*Gemjar owns the core commerce platform.\*\*



\### Principle 2



\*\*Sage 50 and Mintsoft are integrations, not the foundation.\*\*



\### Principle 3



\*\*Business domains must remain modular.\*\*



\### Principle 4



\*\*Pricing logic must be centralized.\*\*



\### Principle 5



\*\*Partial shipments must be treated as a normal workflow.\*\*



\### Principle 6



\*\*Sales-agent access must be restricted server-side.\*\*



\### Principle 7



\*\*Long-running integration work must happen asynchronously.\*\*



\### Principle 8



\*\*Failed integrations must be observable and recoverable.\*\*



\### Principle 9



\*\*The architecture must allow future systems to replace existing providers.\*\*



\### Principle 10



\*\*Undefined business rules must not be silently assumed.\*\*



\---



\# 68. Final Product Definition



Gemjar Commerce Platform is a centralized, independent commerce application consisting of:



\### B2C Ecommerce



A modern consumer storefront supporting product discovery, basket, checkout, accounts and order tracking.



\### B2B Trade Portal



A dedicated trade environment supporting customer-specific catalogues and pricing, advanced ordering, quick ordering, reordering, invoices and account management.



\### Sales Agent Portal



A restricted operational portal allowing sales agents to manage assigned customers and create orders using customer-specific pricing.



\### Core Commerce Engine



A centralized system managing:



\* Products.

\* Customers.

\* Pricing.

\* Orders.

\* Shipments.

\* Tracking.

\* Operational activity.



\### Integration \& Data Exchange Layer



A resilient layer connecting the platform to:



\* Sage 50.

\* Mintsoft.

\* Future accounting systems.

\* Future fulfilment systems.

\* Future ERP systems.

\* Future logistics providers.

\* Additional payment providers.



The source document explicitly defines this future-ready requirement: external systems should be capable of being added, replaced or removed without rebuilding the core commerce platform.



\---



\# 69. Immediate Development Starting Point



Before writing production business features, the recommended first implementation milestone is:



1\. Initialize monorepo.

2\. Configure Next.js application.

3\. Configure NestJS API.

4\. Configure PostgreSQL.

5\. Establish database schema conventions.

6\. Configure Redis.

7\. Configure background worker.

8\. Implement authentication.

9\. Implement RBAC.

10\. Implement core audit infrastructure.

11\. Establish API conventions.

12\. Establish integration abstraction.

13\. Build Product module.

14\. Build Customer/B2B module.

15\. Build Pricing Engine.

16\. Build Order Engine.

17\. Build Shipment model with partial shipment support.



Only after these foundations are stable should the team build the complete B2C, B2B and Sales Agent interfaces.



\---



\## PRD Status



\*\*This PRD captures the full functional direction defined in the Gemjar Solution Scope document, while deliberately marking unspecified areas as TBD rather than inventing requirements.\*\* The remaining discovery work is especially important for Sage 50/Mintsoft integration methods, exact data mappings, synchronization frequency, payment details, returns/cancellations and internal administration rules.



\*\*Recommended next artifact:\*\* a \*\*complete Technical Architecture \& Database Design document\*\*, including the exact PostgreSQL schema, entity relationships, Prisma models, NestJS modules, API specification, RBAC matrix, order state machine, pricing rule hierarchy, and integration architecture. That would be the strongest next step before starting the actual codebase.



