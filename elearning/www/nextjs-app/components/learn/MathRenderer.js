import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * Component to render HTML content with LaTeX math expressions
 * @param {Object} props 
 * @param {string} props.content - HTML content potentially containing LaTeX expressions
 */
export default function MathRenderer({ content }) {
  const [renderedContent, setRenderedContent] = useState("");

  useEffect(() => {
    if (!content) {
      setRenderedContent("");
      return;
    }

    try {
      // Create a temporary div to hold the HTML content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;

      // Find all LaTeX expressions in spans and render them
      const latexElements = tempDiv.querySelectorAll("span.math");
      latexElements.forEach(renderLatexElement);

      // Get processed HTML with inline/display LaTeX
      const htmlContent = tempDiv.innerHTML;
      const processedHtml = processLatexInText(htmlContent);

      // Set final HTML
      setRenderedContent(processedHtml);
    } catch (error) {
      console.error("Error processing content:", error);
      setRenderedContent(content); // fallback
    }
  }, [content]);

  // Decode HTML entities like &lt; to <
  const decodeHtmlEntities = (text) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  };

  // Render LaTeX inside span.math elements
  const renderLatexElement = (element) => {
    try {
      const latex = element.textContent;
      katex.render(latex, element, {
        throwOnError: false,
        displayMode: element.classList.contains("display-math"),
      });
    } catch (err) {
      console.error("Error rendering LaTeX:", err);
    }
  };

  // Process markdown formatting (outside math expressions)
  const processMarkdownFormatting = (text) => {
    if (!text) return "";
    
    // Protect math expressions from markdown processing
    const mathPlaceholders = [];
    let placeholderIndex = 0;
    
    // Replace display math \[...\] with placeholders
    text = text.replace(/\\\[(.*?)\\\]/gs, (match) => {
      const placeholder = `__DISPLAY_MATH_${placeholderIndex}__`;
      mathPlaceholders[placeholderIndex] = match;
      placeholderIndex++;
      return placeholder;
    });
    
    // Replace inline math \(...\) with placeholders
    text = text.replace(/\\\((.*?)\\\)/g, (match) => {
      const placeholder = `__INLINE_MATH_${placeholderIndex}__`;
      mathPlaceholders[placeholderIndex] = match;
      placeholderIndex++;
      return placeholder;
    });
    
    // Process markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    text = text.replace(/^#{3}\s+(.*?)$/gm, '<h3>$1</h3>'); // H3
    text = text.replace(/^#{2}\s+(.*?)$/gm, '<h2>$1</h2>'); // H2
    text = text.replace(/^#{1}\s+(.*?)$/gm, '<h1>$1</h1>'); // H1
    
    // Handle line breaks and paragraphs  
    text = text.replace(/\n\n+/g, '</p><p>'); // Multiple line breaks = new paragraph
    text = text.replace(/\n/g, '<br>'); // Single line break = <br>
    
    // Wrap in paragraphs if not already wrapped in block elements
    if (!text.match(/^<(h[1-6]|ul|ol|li|p|div)/)) {
      text = '<p>' + text + '</p>';
    }
    
    // Clean up empty paragraphs
    text = text.replace(/<p><\/p>/g, ''); 
    text = text.replace(/<p>\s*<\/p>/g, '');
    
    // Restore math expressions
    for (let i = 0; i < mathPlaceholders.length; i++) {
      text = text.replace(`__DISPLAY_MATH_${i}__`, mathPlaceholders[i]);
      text = text.replace(`__INLINE_MATH_${i}__`, mathPlaceholders[i]);
    }
    
    return text;
  };

  // Render inline and display LaTeX expressions
  const processLatexInText = (text) => {
    if (!text) return "";

    // First process markdown formatting
    text = processMarkdownFormatting(text);
    
    // Then decode any HTML entities
    text = decodeHtmlEntities(text);

    // Render inline math: \(...\)
    let processed = text.replace(/\\\((.*?)\\\)/g, (match, p1) => {
      try {
        return katex.renderToString(p1, { throwOnError: false, displayMode: false });
      } catch (err) {
        console.error("Error rendering inline LaTeX:", err);
        return match;
      }
    });

    // Render display math: \[...\]
    processed = processed.replace(/\\\[(.*?)\\\]/g, (match, p1) => {
      try {
        return katex.renderToString(p1, { throwOnError: false, displayMode: true });
      } catch (err) {
        console.error("Error rendering display LaTeX:", err);
        return match;
      }
    });

    return processed;
  };

  return (
    <div
      className="math-content"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}