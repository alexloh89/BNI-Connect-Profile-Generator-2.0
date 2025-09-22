
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";

// Ensure all required DOM elements are available
const form = document.getElementById('profile-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const btnText = generateBtn.querySelector('.btn-text') as HTMLSpanElement;
const spinner = generateBtn.querySelector('.spinner') as HTMLSpanElement;
const htmlOutputsContainer = document.getElementById('html-outputs-container') as HTMLDivElement;
const livePreview = document.getElementById('live-preview') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const imageInputsContainer = document.getElementById('image-inputs-container') as HTMLDivElement;
const addImageBtn = document.getElementById('add-image-btn') as HTMLButtonElement;
const videoInputsContainer = document.getElementById('video-inputs-container') as HTMLDivElement;
const addVideoBtn = document.getElementById('add-video-btn') as HTMLButtonElement;


if (!form || !generateBtn || !btnText || !spinner || !htmlOutputsContainer || !livePreview || !errorMessage || !imageInputsContainer || !addImageBtn || !videoInputsContainer || !addVideoBtn) {
  throw new Error("A required DOM element is missing.");
}

let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch(e) {
    handleError(new Error("Failed to initialize AI. Please ensure the API key is set correctly."));
}

const systemInstruction = `You are an assistant that generates professional BNI Connect profile HTML blocks.
The user will provide their information. Your task is to convert this information into clean, formatted HTML code suitable for copy-pasting into BNI Connect.
You MUST return a JSON object. The keys must be: "myBusiness", "topProduct", "topProblemSolved", "idealReferral", "idealReferralPartner", and "bniStory".

For each key, generate a single HTML string with the following rules:
1.  **Paragraphs:** Treat each newline in the user's input as a new paragraph. Wrap each paragraph in a <p style="text-align: justify;"> tag. Do NOT include a heading/title for the section.
2.  **Bold Text:** If the user uses Markdown for bolding (e.g., **text** or __text__), convert it to <strong>text</strong> within its paragraph.
3.  **Bullet Points:** If the user creates a list using lines starting with *, -, or +, convert this into an HTML unordered list (<ul>). Each list item (e.g., "* Item 1") should become a <li>Item 1</li>. The entire list should be wrapped in a single <ul> tag. The <ul> tag should be placed after a paragraph or stand on its own, but not inside a <p> tag.
4.  **Structure:** Combine paragraphs and lists into a single, clean HTML string for the section.
5.  **Video Embedding:** If the user provides a YouTube URL and a category, embed the video at the very end of the HTML string for that specific category. The video MUST be wrapped in a responsive container. Use this exact HTML structure, replacing only the '...' with the correct YouTube embed URL: <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin-top: 1rem;"><iframe src="..." style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>. Convert the user's URL to the correct embed format ('/watch?v=' becomes '/embed/'). If the user provides multiple videos for the same category, embed them one after another.
6.  **Empty Fields:** If a user leaves a text field blank, create a simple placeholder paragraph for it.
7.  **Output Format:** The final output MUST be a valid JSON object. Do not include explanations, markdown, or any extra text outside the JSON.
8.  **Character Limit:** The generated HTML string for each key MUST NOT exceed 999 characters. Summarize the content if necessary to meet this limit.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        myBusiness: { type: Type.STRING, description: "HTML for 'My Business' section" },
        topProduct: { type: Type.STRING, description: "HTML for 'Top Product / Service' section" },
        topProblemSolved: { type: Type.STRING, description: "HTML for 'Top Problem Solved' section" },
        idealReferral: { type: Type.STRING, description: "HTML for 'My Ideal Referral' section" },
        idealReferralPartner: { type: Type.STRING, description: "HTML for 'Ideal Referral Partner' section" },
        bniStory: { type: Type.STRING, description: "HTML for 'My Favorite BNI Story' section" },
    },
    required: ["myBusiness", "topProduct", "topProblemSolved", "idealReferral", "idealReferralPartner", "bniStory"]
};

// --- Image Input Management ---
let imageInputIdCounter = 0;
const MAX_IMAGES = 5;

const updateAddImageButtonState = () => {
    const currentCount = imageInputsContainer.children.length;
    addImageBtn.disabled = currentCount >= MAX_IMAGES;
    if (addImageBtn.disabled) {
        addImageBtn.textContent = 'Maximum 5 images';
    } else {
        addImageBtn.textContent = 'Add Image';
    }
};

const addImageInput = () => {
    if (imageInputsContainer.children.length >= MAX_IMAGES) {
        return;
    }
    imageInputIdCounter++;

    const group = document.createElement('div');
    group.className = 'image-input-group';
    group.innerHTML = `
        <div class="form-group">
            <label for="image-category-${imageInputIdCounter}">Category</label>
            <select id="image-category-${imageInputIdCounter}" name="image-category-${imageInputIdCounter}">
                <option value="none">Select Category</option>
                <option value="myBusiness">My Business</option>
                <option value="topProduct">Top Product / Service</option>
                <option value="topProblemSolved">Top Problem Solved</option>
                <option value="idealReferral">My Ideal Referral</option>
                <option value="idealReferralPartner">My Ideal Referral Partner</option>
                <option value="bniStory">My Favorite BNI Story</option>
            </select>
        </div>
        <div class="form-group">
            <label for="image-link-${imageInputIdCounter}">Image Link (Dropbox, Imgur)</label>
            <input type="url" id="image-link-${imageInputIdCounter}" name="image-link-${imageInputIdCounter}" placeholder="Paste public image link">
        </div>
        <button type="button" class="remove-btn" title="Remove image">&times;</button>
    `;

    const removeBtn = group.querySelector('.remove-btn') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => {
        group.remove();
        updateAddImageButtonState();
    });

    imageInputsContainer.appendChild(group);
    updateAddImageButtonState();
};

addImageBtn.addEventListener('click', addImageInput);
addImageInput(); // Add the first image input group by default
// --- End Image Input Management ---


// --- Video Input Management ---
let videoInputIdCounter = 0;
const MAX_VIDEOS = 5;

const updateAddVideoButtonState = () => {
    const currentCount = videoInputsContainer.children.length;
    addVideoBtn.disabled = currentCount >= MAX_VIDEOS;
    if (addVideoBtn.disabled) {
        addVideoBtn.textContent = 'Maximum 5 videos';
    } else {
        addVideoBtn.textContent = 'Add Video';
    }
};

const addVideoInput = () => {
    if (videoInputsContainer.children.length >= MAX_VIDEOS) {
        return;
    }
    videoInputIdCounter++;

    const group = document.createElement('div');
    group.className = 'video-input-group';
    group.innerHTML = `
        <div class="form-group">
            <label for="video-category-${videoInputIdCounter}">Category</label>
            <select id="video-category-${videoInputIdCounter}" name="video-category-${videoInputIdCounter}">
                <option value="none">Select Category</option>
                <option value="myBusiness">My Business</option>
                <option value="topProduct">Top Product / Service</option>
                <option value="topProblemSolved">Top Problem Solved</option>
                <option value="idealReferral">My Ideal Referral</option>
                <option value="idealReferralPartner">My Ideal Referral Partner</option>
                <option value="bniStory">My Favorite BNI Story</option>
            </select>
        </div>
        <div class="form-group">
            <label for="video-link-${videoInputIdCounter}">YouTube Video Link</label>
            <input type="url" id="video-link-${videoInputIdCounter}" name="video-link-${videoInputIdCounter}" placeholder="Paste YouTube link">
        </div>
        <button type="button" class="remove-btn" title="Remove video">&times;</button>
    `;

    const removeBtn = group.querySelector('.remove-btn') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => {
        group.remove();
        updateAddVideoButtonState();
    });

    videoInputsContainer.appendChild(group);
    updateAddVideoButtonState();
};

addVideoBtn.addEventListener('click', addVideoInput);
addVideoInput(); // Add the first video input group by default
// --- End Video Input Management ---


// --- Character Counter ---
function setupCharacterCounters() {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea[maxlength]');
    textareas.forEach(textarea => {
        const maxLength = parseInt(textarea.getAttribute('maxlength') || '1000', 10);
        const counterId = `${textarea.id}-counter`;
        const counterElement = document.getElementById(counterId);

        if (counterElement) {
            const updateCounter = () => {
                const currentLength = textarea.value.length;
                counterElement.textContent = `${currentLength} / ${maxLength}`;
                counterElement.classList.toggle('limit-reached', currentLength >= maxLength);
            };

            textarea.addEventListener('input', updateCounter);
            updateCounter(); // Initial call
        }
    });
}
setupCharacterCounters();
// --- End Character Counter ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ai) return;

    setLoading(true);
    clearOutput();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    let videoEmbedInstructions = '';
    const videoInputGroups = document.querySelectorAll('.video-input-group');
    let videoCounter = 1;

    for (const group of Array.from(videoInputGroups)) {
        const categorySelect = group.querySelector('select') as HTMLSelectElement;
        const linkInput = group.querySelector('input[type="url"]') as HTMLInputElement;
        if (categorySelect && linkInput && linkInput.value && categorySelect.value !== 'none') {
            videoEmbedInstructions += `\nEmbed Video #${videoCounter} ('${linkInput.value}') into the section: '${categorySelect.value}'`;
            videoCounter++;
        }
    }
    if (!videoEmbedInstructions) {
        videoEmbedInstructions = "\nNo videos to embed.";
    }


    const userPrompt = `
        Please generate the BNI profile HTML as a JSON object based on the following information:

        My Business: ${data['my-business'] || 'Not provided.'}
        Top Product/Service: ${data['top-product'] || 'Not provided.'}
        Top Problem Solved: ${data['top-problem-solved'] || 'Not provided.'}
        My Ideal Referral: ${data['ideal-referral'] || 'Not provided.'}
        My Ideal Referral Partner: ${data['ideal-referral-partner'] || 'Not provided.'}
        My Favorite BNI Story: ${data['bni-story'] || 'Not provided.'}
        ${videoEmbedInstructions}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        let generatedData = JSON.parse(response.text);
        
        // --- Image Embedding Logic ---
        const imageSize = (formData.get('image-size') as string) || '100%';
        const imageInputGroups = document.querySelectorAll('.image-input-group');
        let imageErrors: string[] = [];

        for (const group of Array.from(imageInputGroups)) {
            const categorySelect = group.querySelector('select') as HTMLSelectElement;
            const linkInput = group.querySelector('input[type="url"]') as HTMLInputElement;

            if (categorySelect && linkInput) {
                const imageCategory = categorySelect.value;
                const imageLink = linkInput.value;

                if (imageLink && imageCategory !== 'none') {
                    const embeddableUrl = convertShareLinkToDirectLink(imageLink);
                    if (embeddableUrl) {
                        if (generatedData[imageCategory]) {
                            const imgTag = `<img alt="User provided content" style="max-width: ${imageSize}; height: auto; border-radius: 8px; margin-top: 1rem;" src="${embeddableUrl}">`;
                            generatedData[imageCategory] += imgTag;
                        }
                    } else {
                        imageErrors.push(imageLink);
                    }
                }
            }
        }

        if (imageErrors.length > 0) {
            handleError(new Error(`Invalid image link(s) provided: ${imageErrors.join(', ')}. Please use valid, public Dropbox or Imgur links.`));
        }
        // --- End Image Embedding Logic ---
        
        displayHtmlOutputs(generatedData);
        
    } catch (error) {
        handleError(error);
    } finally {
        setLoading(false);
    }
});

function convertShareLinkToDirectLink(url: string): string | null {
    if (!url) return null;
    try {
        if (url.includes('dropbox.com')) {
            // For Dropbox, we ensure the URL ends with ?raw=1 for direct embedding
            const urlObject = new URL(url);
            // remove dl parameter if it exists
            if (urlObject.searchParams.has('dl')) {
                urlObject.searchParams.delete('dl');
            }
            urlObject.searchParams.set('raw', '1');
            return urlObject.toString();
        }

        if (url.includes('imgur.com')) {
            // Reject albums and galleries, as they can't be embedded in a single img tag
            if (url.includes('/a/') || url.includes('/gallery/')) {
                return null;
            }

            // If it's already a direct link (i.imgur.com), use it as is
            if (url.includes('i.imgur.com')) {
                return url;
            }
            
            // Try to convert a page link (e.g., imgur.com/imageId) to a direct image link
            // We'll append .jpg by default. Imgur is good at serving the correct image type.
            const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                const imageId = match[1];
                return `https://i.imgur.com/${imageId}.jpg`;
            }

            return null; // Could not parse as a valid single-image Imgur link
        }

        return null; // Not a supported link type
    } catch (e) {
        console.error("Error parsing image share URL:", e);
        return null;
    }
}

const categoryTitles: Record<string, string> = {
    myBusiness: "My Business",
    topProduct: "Top Product / Service",
    topProblemSolved: "Top Problem Solved",
    idealReferral: "My Ideal Referral",
    idealReferralPartner: "My Ideal Referral Partner",
    bniStory: "My Favorite BNI Story"
};


function displayHtmlOutputs(data: Record<string, string>) {
    htmlOutputsContainer.innerHTML = ''; // Clear previous results
    let fullPreviewHtml = '';
    const BNI_CHAR_LIMIT = 999; // BNI Connect's character limit for these fields.

    for (const key in categoryTitles) {
        if (data[key] && Object.prototype.hasOwnProperty.call(categoryTitles, key)) {
            const title = categoryTitles[key];
            const htmlContent = data[key];
            const charCount = htmlContent.length;
            const isOverLimit = charCount > BNI_CHAR_LIMIT;

            // Add a heading for the preview, but it's not in the copied HTML
            fullPreviewHtml += `<p><strong>${title}</strong></p>${htmlContent}`;

            const outputGroup = document.createElement('div');
            outputGroup.className = 'output-group';
            
            outputGroup.innerHTML = `
                <div class="output-header">
                    <h3>${title}</h3>
                    <div class="output-meta">
                        <span class="char-counter ${isOverLimit ? 'limit-reached' : ''}" title="${charCount} characters used">${charCount} / ${BNI_CHAR_LIMIT}</span>
                        <button class="copy-btn" title="Copy to Clipboard">Copy</button>
                    </div>
                </div>
                <pre><code class="html-output" aria-live="polite">${escapeHtml(htmlContent)}</code></pre>
            `;
            
            const copyBtn = outputGroup.querySelector('.copy-btn') as HTMLButtonElement;
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(htmlContent)
                    .then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    })
                    .catch(() => {
                        handleError(new Error('Failed to copy text.'));
                    });
            });

            htmlOutputsContainer.appendChild(outputGroup);
        }
    }
    livePreview.innerHTML = fullPreviewHtml || '<p>Your profile preview will appear here.</p>';
}

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function setLoading(isLoading: boolean) {
    generateBtn.disabled = isLoading;
    spinner.hidden = !isLoading;
    btnText.textContent = isLoading ? 'Generating...' : 'Generate Profile HTML';
}

function clearOutput() {
    htmlOutputsContainer.innerHTML = '';
    livePreview.innerHTML = '<p>Your profile preview will appear here.</p>';
    errorMessage.hidden = true;
    errorMessage.textContent = '';
}

function handleError(error: any) {
    console.error(error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    const existingMessage = errorMessage.textContent;
    // Append new error message if one already exists
    errorMessage.textContent = existingMessage ? `${existingMessage.replace('Error: ', '')}\n${message}` : `Error: ${message}`;
    errorMessage.hidden = false;
    livePreview.innerHTML = `<p class="error-text">Could not generate preview due to an error.</p>`;
}