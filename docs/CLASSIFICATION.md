# NML Initiative Classification

Source: *Executive Annex to the Culture, First Edition — "What Do We Call This?"*

Every initiative must carry exactly one classification, chosen at creation. The database rejects an unclassified initiative.

> The most dangerous thing is not the failed initiative. It is the unclassified one: work that started as an experiment, lived as a service, was funded like a product, and was never stopped by anyone — because nobody knew what it was.

## The seven types

Each entry below is the hover-popup content for that option in the classification picker. Show `test`, the four attribute rows, and `warning` where present.

### product
- **enum:** `product`
- **label:** Product
- **test:** A recurring need across multiple customers, served by a system that improves — not by effort repeated from scratch for each customer.
- **owner:** Permanent product owner + a fully dedicated vertical team
- **duration:** Open-ended, with a quarterly roadmap
- **measure:** Adoption, retention, recurring revenue
- **exit:** Explicit stop decision after two consecutive quarters of missed metrics
- **warning:** A product without a dedicated owner, staffed by people split across three things, is not a product. It is a project in disguise.

### service
- **enum:** `service`
- **label:** Service
- **test:** We execute for a specific customer for a fee, and it scales with people rather than with systems.
- **owner:** One delivery lead per engagement
- **duration:** Per contract, with a declared cap on the number of deliveries
- **measure:** Margin, delivery time, share of work that can be automated
- **exit:** At the cap — automate, raise the price, or stop
- **warning:** Services are the fastest way to turn a technology company into a delivery agency. Allowed for two reasons only — early revenue or learning from the field — and the reason and the cap must be written on day one.

### project
- **enum:** `project`
- **label:** Project
- **test:** It has a defined output and a known end. After delivery, no continuous work remains.
- **owner:** Temporary project owner; team assembled then dissolved
- **duration:** Fixed in advance; extension requires a new decision
- **measure:** Delivered in scope, on time, at agreed quality
- **exit:** Delivery and handover to whoever will operate it
- **warning:** A project that delivered but never dissolved its team is either a product born by accident, or people held with no reason.

### experiment
- **enum:** `experiment`
- **label:** Experiment
- **test:** We do not know the answer and want it at the lowest cost and fastest time.
- **owner:** One person, part-time, no permanent team
- **duration:** Weeks not months, with a written time cap
- **measure:** Success criterion written before the start, settled by a number
- **exit:** At the cap — promote to product or stop. No third option
- **warning:** An experiment without a pre-written success criterion is not an experiment. It is a funded hobby, and its result will always be interpreted in favour of whoever started it.

### stopgap
- **enum:** `stopgap`
- **label:** Stopgap
- **test:** We treat a symptom now because the business cannot wait, and we know it is not the right solution.
- **owner:** Whoever built it, until it is replaced
- **duration:** No longer than one quarter
- **measure:** Did it stop the bleeding? What does it cost to run manually?
- **exit:** Logged as debt with a repayment date, reviewed monthly
- **warning:** A stopgap that survived a year has become a permanent process with no design, no documentation and no owner — the most dangerous thing that accumulates in a startup.

### internal_capability
- **enum:** `internal_capability`
- **label:** Internal Capability
- **test:** No external customer uses it, but more than one product depends on it.
- **owner:** A horizontal team with published standards and a clear interface
- **duration:** Open-ended; priorities set quarterly with product leads
- **measure:** Number of products relying on it, their speed because of it, its reliability
- **exit:** If only one product depends on it, it returns to that product
- **warning:** Building a platform before two real products need it is the most elegant form of waste.

### process
- **enum:** `process`
- **label:** Process
- **test:** Recurring internal work that never ends and is executed the same way every time.
- **owner:** One process owner who owns improving it, not only running it
- **duration:** Open-ended, reviewed twice a year
- **measure:** Cycle time, error rate, manual cost
- **exit:** Full automation, or cancellation if the need disappears

## Classifying in five minutes

Six questions in order. The first that answers yes settles the type — do not continue past it. Render this as a collapsible helper beside the picker.

| # | Question | Type |
|---|---|---|
| 1 | Do we not know the answer and want to test it cheaply? | Experiment |
| 2 | Does it have a known end, with no continuous work after delivery? | Project |
| 3 | Do we know it is not the right solution, and are doing it to stop harm now? | Stopgap |
| 4 | Is it executed for a specific customer, repeated with human effort each time? | Service |
| 5 | Is it used by more than one product internally, unseen by customers? | Internal Capability |
| 6 | Is it recurring internal work done the same way every time? | Process |
| — | None of the above, and the need recurs across multiple customers? | Product |

## Comparison at a glance

| Type | Continues? | Scales with | Measured by |
|---|---|---|---|
| Product | Yes | Systems | Adoption and revenue |
| Service | Capped | People | Margin and delivery time |
| Project | No | — | Delivery |
| Experiment | No | — | Validity of the hypothesis |
| Stopgap | No | — | Harm stopped |
| Internal Capability | Yes | Dependents | Product speed and reliability |
| Process | Yes | — | Cycle time and error rate |

## The five governing rules

1. **No work starts without a classification.** A recorded initiative with no type is an initiative with no approval.
2. **Every type has a cap and an exit condition.** Everything ends except products and processes.
3. **Promotion is a decision, not a drift.** An experiment becomes a product because someone decided and signed, not because it survived.
4. **Nothing starts unless something stops.** Every new initiative arrives with an explicit answer: what will be delayed or stopped in exchange?
5. **One owner regardless of type.** A single name is accountable.
