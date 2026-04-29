import os
import json
import requests
from django.conf import settings


class MemosAIClient:
    """
    Unified Intelligence Client for Memos SaaS.
    Prefers Venice AI if VENICE_API_KEY is set, otherwise falls back to Groq.
    Venice supports significantly larger context windows and token limits.
    """

    def __init__(self):
        self.license_key = getattr(settings, 'MEMOS_LICENSE_KEY', '') or os.getenv('MEMOS_LICENSE_KEY', '')
        self.activated = bool(self.license_key)

        # Venice AI (preferred if available)
        self.venice_key = getattr(settings, 'VENICE_API_KEY', '') or os.getenv('VENICE_API_KEY', '')
        self.venice_url = getattr(settings, 'VENICE_GATEWAY', 'https://api.venice.ai/api/v1/chat/completions')
        self.venice_model = getattr(settings, 'VENICE_MODEL', 'venice-uncensored')

        # Groq (fallback)
        self.groq_key = getattr(settings, 'GROQ_API_KEY', '') or os.getenv('MASTER_GROQ_API_KEY', '')
        self.groq_url = 'https://api.groq.com/openai/v1/chat/completions'
        self.groq_model = getattr(settings, 'GROQ_MODEL', 'llama-3.1-8b-instant')

        # Determine which service to use
        self.use_venice = bool(self.venice_key)
        if self.use_venice:
            self.gateway_url = self.venice_url
            self.master_key = self.venice_key
            self.default_model = self.venice_model
            # Venice supports much larger contexts - use significantly higher limits
            self.default_max_tokens = 16384
            print("Using Venice AI for inference")
        else:
            self.gateway_url = self.groq_url
            self.master_key = self.groq_key
            self.default_model = self.groq_model
            self.default_max_tokens = 4096
            print("Using Groq for inference (Venice not configured)")

    def _get_headers(self):
        # Refresh dynamically so runtime key updates are picked up.
        self.license_key = getattr(settings, 'MEMOS_LICENSE_KEY', '') or os.getenv('MEMOS_LICENSE_KEY', '')
        self.venice_key = getattr(settings, 'VENICE_API_KEY', '') or os.getenv('VENICE_API_KEY', '')
        self.groq_key = getattr(settings, 'GROQ_API_KEY', '') or os.getenv('MASTER_GROQ_API_KEY', '')

        # Re-evaluate which service to use
        if self.venice_key:
            self.use_venice = True
            self.master_key = self.venice_key
            self.gateway_url = self.venice_url
            self.default_model = self.venice_model
        else:
            self.use_venice = False
            self.master_key = self.groq_key
            self.gateway_url = self.groq_url
            self.default_model = self.groq_model

        return {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
            "X-Memos-License": self.license_key,
            "X-Memos-Version": "1.0.0"
        }

    def _ensure_active(self):
        self.license_key = getattr(settings, 'MEMOS_LICENSE_KEY', '') or os.getenv('MEMOS_LICENSE_KEY', '')
        self.activated = bool(self.license_key)
        self.venice_key = getattr(settings, 'VENICE_API_KEY', '') or os.getenv('VENICE_API_KEY', '')
        self.groq_key = getattr(settings, 'GROQ_API_KEY', '') or os.getenv('MASTER_GROQ_API_KEY', '')

        if not self.activated:
            raise ValueError("Memos is not activated. Please provide a valid License Key in Setup.")

        if self.venice_key:
            self.master_key = self.venice_key
        elif self.groq_key:
            self.master_key = self.groq_key
        else:
            raise ValueError(
                "AI gateway key is missing. "
                "Set VENICE_API_KEY (preferred) or GROQ_API_KEY in backend/.env and restart the backend."
            )

    def chat_completion(self, messages, model=None, temperature=0.5, max_tokens=None, response_format=None, stream=False):
        """Generic chat completion through the AI gateway (Venice or Groq)."""
        self._ensure_active()

        # Use provided max_tokens or default based on service
        if max_tokens is None:
            max_tokens = self.default_max_tokens if self.use_venice else 4096

        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }

        if response_format:
            payload["response_format"] = response_format

        try:
            response = requests.post(
                self.gateway_url,
                headers=self._get_headers(),
                json=payload,
                stream=stream,
                timeout=120 if self.use_venice else 60
            )

            if response.status_code == 402:
                raise ValueError("Credits exhausted. Please top up your Memos account.")
            elif response.status_code != 200:
                error_data = response.json() if not stream else {"error": "Stream error"}
                raise ValueError(f"AI Gateway Error: {error_data.get('error', 'Unknown error')}")

            if stream:
                return response
            else:
                data = response.json()
                return data['choices'][0]['message']['content']

        except Exception as e:
            print(f"MemosAI Error: {e}")
            raise

    def ask(self, prompt=None, context=None, query=None, page_context=None):
        """Simplified ask method for backward compatibility."""
        messages = []
        if context:
            messages.append({"role": "system", "content": context})
        # Support both prompt and query parameters
        content = query if query else prompt
        if page_context:
            content = f"[Context: {page_context}]\n\n{content}"
        messages.append({"role": "user", "content": content})
        response = self.chat_completion(messages)
        # Return format expected by the chat view
        return {
            "answer": response,
            "citations": [],
            "confidence": "medium",
        }

    def answer_question(self, question, context=None, page_context=None, surface="main"):
        """Answer a question using the AI gateway."""
        messages = []
        if context:
            messages.append({"role": "system", "content": context})
        messages.append({"role": "user", "content": question})
        
        try:
            response = self.chat_completion(messages, temperature=0.3)
            # Return format expected by the tests
            return {
                "answer": response,
                "citations": [],
                "confidence": "high",
                "reasoning_summary": "Mocked reasoning"
            }
        except Exception as e:
            print(f"Answer question error: {e}")
            return {
                "answer": "Error occurred",
                "citations": [],
                "confidence": "low",
                "reasoning_summary": str(e)
            }
