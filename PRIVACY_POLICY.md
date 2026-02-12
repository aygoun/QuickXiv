# QuickXiv Privacy Policy

**Last Updated:** February 12, 2026
**Extension Version:** 1.0.0

## Introduction

QuickXiv ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how the QuickXiv browser extension ("Extension," "Service") collects, uses, stores, and protects your information when you use our Extension.

By installing and using QuickXiv, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

### 1. Information You Provide

- **Hugging Face API Key**: When you configure the Extension, you may provide your Hugging Face API key. This key is stored locally on your device using Chrome's `chrome.storage.sync` API and is never transmitted to our servers or any third party except Hugging Face's Inference API for the purpose of generating summaries.

### 2. Information Automatically Collected

- **Paper Identifiers**: The Extension extracts arXiv paper IDs from URLs you visit (e.g., `2301.12345`). These identifiers are used solely to identify papers for summarization and caching purposes.

- **Usage Statistics**: The Extension tracks the following metrics locally on your device:
  - Number of summarization requests
  - Estimated token usage (input and output)
  - Number of unique papers summarized
  - Recent summarization history (last 20 papers, including paper titles, token counts, and timestamps)

- **Cached Summaries**: To improve performance, the Extension caches generated summaries locally on your device for up to 7 days. Cached data includes:
  - Paper title, authors, and abstract
  - Section titles from the paper
  - Generated summary content

### 3. Information Transmitted to Third Parties

- **Paper Content**: When you request a summary, the Extension sends paper text content (title, abstract, and body sections) to Hugging Face's Inference API (`router.huggingface.co`) for processing. This transmission is necessary to generate summaries.

- **API Authentication**: Your Hugging Face API key is transmitted to Hugging Face's servers for authentication purposes only.

- **Paper HTML**: The Extension fetches paper HTML content from `ar5iv.labs.arxiv.org` to extract paper text. This is a public service and does not involve personal data.

## How We Use Your Information

We use the collected information solely for the following purposes:

1. **Service Functionality**: To generate summaries of arXiv papers you request
2. **Performance Optimization**: To cache summaries and avoid redundant API calls
3. **Usage Tracking**: To provide you with usage statistics within the Extension interface
4. **Error Handling**: To display error messages and troubleshoot issues

## Data Storage

### Local Storage

All data collected by the Extension is stored locally on your device using Chrome's storage APIs:

- **`chrome.storage.sync`**: Used for your Hugging Face API key and usage statistics. This data is synchronized across your Chrome browsers when signed into Chrome Sync.
- **`chrome.storage.local`**: Used for cached summaries. This data remains on your device and is not synchronized.

### Data Retention

- **API Key**: Stored until you remove it or uninstall the Extension
- **Usage Statistics**: Stored until you clear them manually via the Extension's usage dashboard
- **Cached Summaries**: Automatically deleted after 7 days or when you clear browser data

## Data Sharing and Disclosure

We do not sell, trade, or rent your personal information to third parties. We share information only in the following circumstances:

1. **Hugging Face API**: Paper content and your API key are transmitted to Hugging Face's Inference API as necessary to provide the summarization service. Your use of Hugging Face's services is subject to [Hugging Face's Privacy Policy](https://huggingface.co/privacy).

2. **ar5iv Service**: Paper HTML is fetched from ar5iv.labs.arxiv.org, a public service for converting arXiv papers to HTML format.

3. **Legal Requirements**: We may disclose information if required by law or in response to valid legal requests.

## Permissions Explained

The Extension requests the following browser permissions:

- **`activeTab`**: Allows the Extension to interact with arXiv paper pages you visit
- **`storage`**: Enables local storage of your API key, usage statistics, and cached summaries
- **`tabs`**: Permits the Extension to identify the active tab to determine which paper you are viewing
- **`scripting`**: Allows injection of content scripts into arXiv pages to display the sidebar interface

### Host Permissions

- **`https://arxiv.org/*`**: Required to detect and interact with arXiv paper pages
- **`https://ar5iv.labs.arxiv.org/*`**: Required to fetch paper HTML content for parsing
- **`https://router.huggingface.co/*`**: Required to communicate with Hugging Face's Inference API for summarization

## Your Rights and Choices

You have the following rights regarding your data:

1. **Access**: You can view your stored API key and usage statistics within the Extension's settings and usage dashboard.

2. **Deletion**:
   - You can remove your API key at any time through the Extension's settings
   - You can clear usage statistics via the usage dashboard
   - Cached summaries are automatically deleted after 7 days
   - Uninstalling the Extension removes all stored data

3. **Control**: You control when summaries are generated by clicking the "Summarize" button. The Extension does not automatically send data to third parties without your explicit action.

4. **Opt-Out**: You can stop using the Extension at any time by disabling or uninstalling it.

## Data Security

- All data is stored locally on your device using Chrome's secure storage APIs
- API keys are stored using Chrome's `chrome.storage.sync`, which encrypts data in transit when syncing across devices
- Communication with Hugging Face's API uses HTTPS encryption
- We do not operate any servers that receive or store your data

## Children's Privacy

QuickXiv is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy. You are advised to review this Privacy Policy periodically for any changes.

## Third-Party Services

This Extension integrates with the following third-party services:

- **Hugging Face Inference API**: Used for AI-powered summarization. See [Hugging Face Privacy Policy](https://huggingface.co/privacy) and [Terms of Service](https://huggingface.co/terms).
- **ar5iv**: A public service for converting arXiv papers to HTML. See [ar5iv About Page](https://ar5iv.labs.arxiv.org/).

We are not responsible for the privacy practices of these third-party services. We encourage you to review their privacy policies.

## Disclaimer

The summaries generated by QuickXiv are produced by third-party AI models (Hugging Face's Mistral-7B-Instruct) and may contain inaccuracies, hallucinations, or misrepresentations of the original paper. **We are not responsible for the content of generated summaries.** QuickXiv is designed to help you quickly scan papers for relevance—it is not a substitute for reading the paper itself.

## Contact Information

If you have questions about this Privacy Policy or our data practices, please contact us:

- **GitHub Repository**: [https://github.com/armandblin/QuickXiv](https://github.com/armandblin/QuickXiv)
- **Issues**: Please open an issue on GitHub for privacy-related inquiries

## Compliance

This Privacy Policy is designed to comply with:

- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Chrome Web Store Developer Program Policies
- Manifest V3 Extension Requirements

---

**Note**: This Extension operates entirely client-side. We do not operate any servers that collect, store, or process your personal information. All data processing occurs locally on your device or is transmitted directly to third-party services (Hugging Face API) that you authorize through your API key.
