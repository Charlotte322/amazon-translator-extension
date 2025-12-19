Amazon Chinese-English Real-Time Translation Browser Extension (Local LLM Powered)
---

## English Description
### Project Introduction
A browser extension deeply optimized for Amazon shopping scenarios, **powered by a local fine-tuned large language model (LLM)** to enable real-time automatic Chinese-English mutual translation. It focuses on full-scene translation in Amazon buyers' chat windows — covering customer service options, product card information, and all conversation content between buyers and customer service. No reliance on third-party translation APIs, ensuring better privacy, faster response times, and far higher accuracy than general-purpose translation tools through scenario-specific fine-tuning.

The extension directly connects to the locally fine-tuned LLM `Llama3.1-8b-q4_k_m.gguf` in the background, enabling offline translation and perfectly adapting to cross-language shopping communication needs. Say goodbye to order disputes and product misunderstandings caused by language barriers.

### Core Features
1. One-click translation: Instantly display full-scene translation results with a single button click — zero learning curve
2. Intelligent language detection: Automatically identifies Chinese/English content, no need to manually switch translation directions, adapting to mixed-language scenarios
3. Seamless experience: No page refresh required, translation integrates smoothly with browsing and chatting operations without lag
4. Non-intrusive design: Translation popups won't block core page content or interrupt the shopping process
5. Full-scene coverage: Supports translation of customer service options, product cards, chat history, and all other target scenarios in buyers' chat windows
6. Precise terminology matching: Optimized for Amazon product categories, transaction terms, and customer service scripts, ensuring unambiguous translations

### Paid Core Advantages
Compared with free translation tools/third-party APIs, the paid value of this extension lies in:
1. Scenario-Specific Fine-Tuning: Optimized Llama3.1-8b model based on real Amazon shopping conversation data, accurately recognizing product terms for 3C, home goods, beauty, and other categories, as well as high-frequency expressions in customer service and transaction scenarios (e.g., refunds/exchanges). Translation accuracy exceeds 95%, far surpassing general-purpose translation tools.
2. Zero Ongoing Costs: One-time payment for lifetime access, no API call limits, no monthly/annual subscriptions — the more you translate, the more cost-effective it is. High-frequency cross-border shoppers save hundreds of dollars annually on API fees.
3. Ultimate Privacy Protection: The model runs locally throughout the process; conversation data, product information, and personal shopping preferences are not uploaded to the cloud or third-party servers, eliminating information leakage risks (especially suitable for business procurement and privacy-sensitive users).
4. Pure User Experience: No pop-up ads, no forced diversion, no feature restrictions — focusing solely on core translation needs without interfering with shopping.
5. Priority Benefits: Paid users enjoy one-on-one technical support and early access to feature updates (e.g., multi-language expansion, custom terminology, translation history export in future versions).

### Prerequisites
1. Browser: Chrome or Edge (latest version recommended)
2. Local LLM: Prepared fine-tuned `Llama3.1-8b-q4_k_m.gguf` file
3. LLM Runtime Environment: Ensure local support for GGUF format models (e.g., configure llama.cpp or similar dependencies in advance)

### Model Acquisition
This plugin relies on the fine-tuned large model `Llama3.1-8b-q4_k_m.gguf`, which has been published on Hugging Face Hub. You can obtain it through the following methods:
- Direct Download: [Llama3.1-8b-q4_k_m.gguf](https://huggingface.co/Charlotte322/Llama3.1-8b-amazon-translator/blob/main/Llama3.1-8b-q4_k_m.gguf)
- Hugging Face Repository URL: [https://huggingface.co/Charlotte322/Llama3.1-8b-amazon-translator](https://huggingface.co/Charlotte322/Llama3.1-8b-amazon-translator)

#### Download Instructions
1. A Hugging Face account is required (free to register)
2. You can download in bulk via the Hugging Face CLI:
   ```bash
   pip install huggingface-hub
   hf_hub_download --repo-id Charlotte322/Llama3.1-8b-amazon-translator --filename Llama3.1-8b-q4_k_m.gguf --local-dir ./models
   ```

### Installation Steps
#### Chrome Browser
1. Download the repository code or the packaged extension from the Releases page
2. Open Chrome and navigate to `chrome://extensions/` to access the Extensions Management page
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `chrome-extension` folder of this project
5. The extension icon will appear in the browser's top-right corner — installation complete
6. Click the extension icon, configure the local file path of `Llama3.1-8b-q4_k_m.gguf` in the popup, and save

#### Edge Browser
1. Download the repository code or the packaged extension from the Releases page
2. Open Edge and navigate to `edge://extensions/` to access the Extensions Management page
3. Enable "Developer mode" (location may vary by version, usually in the top-right corner)
4. Click "Load unpacked" and select the `chrome-extension` folder of this project
5. The extension icon will appear in the browser's top-right corner — installation complete
6. Click the extension icon, configure the local file path of `Llama3.1-8b-q4_k_m.gguf` in the popup, and save

### Usage
1. Open any Amazon product detail page, click the seller's name next to "Sold by", then click "Ask a question" under "Have a question for [Seller Name]?" to access the customer service chat window
2. Confirm the local LLM path is correctly configured in the extension
3. Click the extension icon in the browser's top-right corner to enable translation
4. All target content on the page (customer service options, product cards, chat text, etc.) will be automatically translated in real-time — no additional operations needed

### Support & Sponsorship
The development of this extension and LLM fine-tuning have invested a great deal of time and effort. To ensure continuous feature optimization, technical support, and model iteration, please unlock all functions with a one-time payment or sponsor voluntarily through the following channels:

#### One-Time Payment (Lifetime Access)
- USD: $14.99 (PayPal supported)

#### Sponsorship Benefits
1. Unlock all premium features with one-time payment (unlimited usage)
2. Join the exclusive user group to get one-on-one technical support (resolving model configuration, extension usage, etc.)
3. Prioritize feature requests and participate in beta testing of new versions (e.g., custom terminology library, multi-language expansion)
4. Enjoy permanent free access to subsequent feature updates and model optimizations (continuously adapting to Amazon page iterations)

### License
MIT License

### Acknowledgements
- Fine-tuned based on the Llama3.1-8b model
- Thanks to Chrome/Edge extension ecosystem
- Thanks to GitHub platforms
- Thanks to all paid users and sponsors for their support
