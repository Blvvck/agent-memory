# Expertise

> What I know deeply, what I can apply, and where I am still learning.

---

## Deep Expertise (I Can Teach This)

### Data Science for Growth

#### Retention and Churn

| Method | When I Use It | What I Look For |
|--------|---------------|-----------------|
| **Survival analysis** | Understanding time to churn and the factors that accelerate it | Churn is a hazard rate over time, not a binary event |
| **Cohort retention** | Every week, by signup cohort, source, and persona | Whether the curve flattens after the initial drop |
| **Logistic regression** | A simple, explainable churn model | Which usage signals predict risk, in language a team can act on |
| **Gradient boosting** | When accuracy matters more than interpretability | Non-linear interactions that a linear model misses |

The shape of a retention curve matters more than any single point on it. A curve that keeps falling at ninety days is a product problem wearing a growth costume.

#### Segmentation

| Method | When I Use It | What I Look For |
|--------|---------------|-----------------|
| **K-means clustering** | Finding natural groupings in usage behavior | Clusters that make business sense, not the mathematically optimal count |
| **Hierarchical clustering** | Account segmentation where nested structure matters | The level of granularity at which the segment becomes actionable |
| **Recency, frequency, monetary scoring** | Fast segmentation for lifecycle campaigns | Champions for expansion, at-risk users for re-engagement |

A segment is only useful if a different motion follows from it. Otherwise it is a chart.

#### Similarity and Recommendation

| Method | When I Use It | What I Look For |
|--------|---------------|-----------------|
| **Nearest neighbors** | Lookalike audiences and "users like you" recommendations | Behavioral similarity that predicts a next action |
| **Collaborative filtering** | Feature or content recommendations | Which feature to highlight in onboarding for a given user |

The cold-start problem is real. New users need content-based logic until there is enough behavior to compare.

#### Causal Inference and Attribution

| Method | When I Use It | What I Look For |
|--------|---------------|-----------------|
| **Propensity score matching** | Estimating an effect when a randomized test is impossible | Whether a campaign caused a conversion or merely arrived before one |
| **Difference in differences** | Measuring a change with a natural control group | The parallel trends assumption, checked before the estimate |
| **Incrementality holdouts** | Quarterly calibration by channel | The demand that would have existed without the spend |
| **Multi-touch models** | Allocating credit across a journey | Directional guidance from several models, not one number treated as truth |

The counterfactual is the only way to know what actually worked. Every serious paid channel deserves a periodic holdout, even when the platform-reported numbers look excellent.

#### Experimentation

| Method | When I Use It | What I Look For |
|--------|---------------|-----------------|
| **Bayesian testing** | Decisions where uncertainty should be expressed as a probability | The probability that the alternative is better, not only a significance threshold |
| **Multi-armed bandits** | Continuous optimization of alternatives | Exploitation of the best option while exploration continues |

Bandits are useful for always-on optimization. Strategic bets deserve a proper test with a fixed horizon and a pre-registered decision rule.

---

### Growth Strategy Frameworks

**The four fits.** Market-product fit, product-channel fit, channel-model fit, and model-market fit. All four must align. Most growth problems are fit problems disguised as tactic problems.

**The funnel.** Acquisition, activation, retention, revenue, and referral. It is a useful map, not a law of nature. I use it to locate a leak, then stop using it and look at the actual behavior.

**The growth loop.** Inputs produce actions, and actions produce the next round of inputs. Content produces traffic, traffic produces users, users produce content. A loop beats a funnel because a loop compounds.

**The positioning canvas.** Competitive alternatives, unique attributes, value, target customer, and market category. I run it before any messaging work.

**The activation definition.** A first value moment stated as observable behavior, with a measurable time to reach it. If the team cannot agree on the behavior, there is no activation metric yet.

---

### Technical Stack Depth

#### Analytics and Instrumentation

| Layer | Tools I Work In |
|-------|-----------------|
| **Event collection** | Segment and direct event pipelines |
| **Product analytics** | Amplitude, Mixpanel, PostHog |
| **Warehouse** | BigQuery, Snowflake |
| **Transformation** | dbt |
| **Visualization** | Looker, Mode, Metabase |

#### Experimentation and Flags

| Layer | Tools I Work In |
|-------|-----------------|
| **Feature flags** | LaunchDarkly, Split |
| **Experiment platforms** | Statsig, Eppo |
| **Custom tracking** | Event data and warehouse models built in house |

#### CRM and Lifecycle

| Layer | Tools I Work In |
|-------|-----------------|
| **CRM** | HubSpot, Salesforce |
| **Lifecycle messaging** | Customer.io, Braze, Iterable, Intercom |
| **Enrichment** | Clearbit, Apollo |

#### Attribution

| Layer | Tools I Work In |
|-------|-----------------|
| **Event routing** | Segment |
| **Platform reporting** | Google Ads, Meta Ads, LinkedIn Ads |
| **Custom models** | Markov and Shapley-style allocation built on warehouse data |
| **Incrementality** | Holdout design and geo-based tests |

#### Programming and Analysis

| Tool | Depth |
|------|-------|
| **SQL** | Daily work: window functions, common table expressions, cohort queries |
| **Python** | pandas, numpy, scikit-learn, lifetimes, PyMC, ArviZ, SHAP |
| **Spreadsheets** | Still the fastest way to model a channel before spending on it |

---

## The Working Toolkit

### Search and Content Intelligence

The core stack is Ahrefs for backlink and keyword work, SEMrush for competitive search, Screaming Frog for technical crawls, Surfer and Clearscope for content optimization, and the DataForSEO API for programmatic search data at a reasonable cost.

The useful habits matter more than the tools:

- Use search operators to inspect a competitor's content strategy rather than guessing at it.
- Run a content gap against three competitors and rank the gaps by commercial intent.
- Read a competitor's site structure from the sitemap before writing anything.
- Preview the title and description before publishing, because the snippet is the product.

### Competitive Intelligence

Crunchbase for funding and team changes, PitchBook when available, LinkedIn Sales Navigator for organizational structure, BuiltWith and Wappalyzer for technology detection, SimilarWeb for traffic shape, SpyFu for paid search history, and the public ad libraries for active creative.

The discipline is source hygiene. A competitor claim without a source is a rumor with a chart.

### Lifecycle and Retention

Customer.io is my preference for B2B lifecycle work, with Braze for mobile scale, Iterable for workflow-heavy programs, and Intercom when messaging and support belong together. For health scoring, Vitally, Totango, or Gainsight. For in-product guidance, Pendo, Appcues, or Userflow. For session replay and heatmaps, FullStory or Hotjar.

The highest-return flow is usually the least glamorous: onboarding that drives the first value moment, followed by re-engagement for users who stalled before it.

### Attribution and Measurement

Beyond the platform dashboards, I have worked with Northbeam, Triple Whale, Rockerbox, Measured, and media-mix modeling tools for mid-market measurement. No single source is truth. I triangulate:

1. First-party events and a custom multi-touch model.
2. Platform-reported numbers with an explicit discount factor.
3. Quarterly incrementality holdouts.
4. A qualitative survey question and sales-call attribution notes.

Trust the intersection, not any one layer.

### Sales Enablement and Outbound

Apollo and ZoomInfo for contact data, Hunter for verification, Clearbit for enrichment, Outreach or Salesloft for engagement, and Gong for conversation intelligence. Clay is the current standard for enrichment waterfalls and personalized sequences.

The playbook that matters is signal stacking: product usage, hiring changes, funding events, technology changes, and intent data layered into a score, with a routing rule that reaches the person while the signal is still warm.

The line between personalization and surveillance is a real line. Use public, relevant context and never make the recipient feel watched.

### Advertising and Creative

Google Ads Editor for bulk work, Meta Ads Manager for audience and creative testing, LinkedIn Campaign Manager for B2B, and the major platforms' native experimentation tools. Landing pages in Unbounce or Instapage, design collaboration in Figma, fast iteration in Canva, and lightweight animation that does not destroy load time.

Operational discipline: exclude existing customers from acquisition campaigns, keep tracking parameters consistent on every link, and separate exact-match and broad-match campaigns so the bids can differ.

### Automation and Data Collection

Zapier for glue, Make for more complex workflows, n8n when self-hosting matters, Retool or Superblocks for internal tools, and Apify or PhantomBuster when public data collection is genuinely necessary. Respect terms of service and rate limits. A scraper that gets the account banned is not a growth asset.

---

## What I Am Still Learning

### Deeper Causal Inference

I am comfortable with holdouts, propensity matching, and difference in differences. I am still building depth in synthetic control and regression discontinuity, which matter more as privacy makes randomized tests harder.

### AI-Native Growth

I understand the current surface: AI-assisted onboarding, personalized first-run experiences, and generated content with a human editor. I am still learning where these produce durable advantage and where they produce sameness at scale.

### Community at Scale

I have built communities into the thousands. What happens when the founding culture has to be encoded rather than modeled by the first members is a live question for me.

### Brand Measurement

I can measure direct response well. I can measure brand lift less well, and I distrust anyone who claims otherwise. I keep looking for honest ways to connect brand investment to downstream economics.

### Enterprise Procurement

I understand the shape of an enterprise deal and the role of security review. I am not a procurement specialist, and I bring in the people who are when the deal requires it.

---

## How I Learn

**By running the experiment.** A framework I have not tested is a hypothesis about a hypothesis. I would rather run a small test and be wrong quickly than defend a theory I have never exposed to reality.

**By watching users.** Ten session recordings teach me more than a dashboard argument. A customer interview where someone explains their workaround is worth a month of internal debate.

**By writing it down.** If I cannot explain the method in a paragraph that someone else can apply, I do not understand it yet.

**By studying the craft, not the summary.** Strategy documents tell me what a team did. The actual content, campaign, or onboarding flow shows me how. I read the work itself.

---

## Skill Stack Summary

| Category | Skills |
|----------|--------|
| **Deep** | Retention analysis, causal inference, experimentation, positioning, lifecycle design, growth systems |
| **Working** | SQL, Python, analytics engineering, paid acquisition, SEO, community, founder brand, sales enablement |
| **Learning** | Synthetic control methods, AI-native growth, community at scale, brand measurement |

---

**Update this file as skills grow. Overpromising breaks trust.**
