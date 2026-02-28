from __future__ import annotations
"""
Shared IBM watsonx.ai client utilities.
All pipeline stages import from here.

Uses ibm-watson-machine-learning SDK directly (ibm-watsonx-ai stub 0.0.5
does not expose Credentials on Python 3.9).
"""

import os
import time
import json
import re
import logging
from typing import Union, List
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)

_text_model = None
_embedding_model = None

_WML_CREDENTIALS: dict | None = None
PROJECT_ID: str | None = None


def _get_wml_credentials():
    global _WML_CREDENTIALS, PROJECT_ID
    if _WML_CREDENTIALS is None:
        _WML_CREDENTIALS = {
            "url": os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
            "apikey": os.getenv("WATSONX_API_KEY"),
        }
        PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
    return _WML_CREDENTIALS, PROJECT_ID


def get_text_model():
    global _text_model
    if _text_model is None:
        from ibm_watson_machine_learning.foundation_models import Model
        from ibm_watson_machine_learning.metanames import GenTextParamsMetaNames as GenParams
        creds, project_id = _get_wml_credentials()
        params = {
            GenParams.MAX_NEW_TOKENS: 8192,
            GenParams.TEMPERATURE: 0.1,
            GenParams.REPETITION_PENALTY: 1.1,
        }
        _text_model = Model(
            model_id="ibm/granite-3-3-8b-instruct",
            params=params,
            credentials=creds,
            project_id=project_id,
        )
    return _text_model


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from ibm_watson_machine_learning.foundation_models import Model
        creds, project_id = _get_wml_credentials()
        _embedding_model = Model(
            model_id="ibm/granite-embedding-278m-multilingual",
            credentials=creds,
            project_id=project_id,
        )
    return _embedding_model


def granite_generate(system: str, user: str, retries: int = 3) -> str:  # type: ignore[return]
    """Call Granite via generate_text with retry + exponential backoff."""
    model = get_text_model()
    # ibm-watson-machine-learning uses a single prompt string; format as chat turns
    prompt = f"<|system|>\n{system}\n<|user|>\n{user}\n<|assistant|>\n"
    for attempt in range(retries):
        try:
            response = model.generate_text(prompt=prompt)
            return response
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(f"Granite generate attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)
    raise RuntimeError(f"Granite generate failed after {retries} attempts")


def granite_embed(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using Granite Embeddings with retry."""
    model = get_embedding_model()
    for attempt in range(3):
        try:
            result = model.embed_documents(texts)
            return result
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(f"Granite embed attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)
    raise RuntimeError("Granite embed failed after 3 attempts")


def parse_json_response(raw: str) -> Union[dict, list]:
    """
    Robustly extract JSON from a Granite response.
    Handles markdown code fences, leading/trailing text.
    """
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    raw = re.sub(r"```\s*$", "", raw).strip()

    # Try direct parse first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Find the first { or [ and last } or ]
    start = min(
        (raw.find("{") if raw.find("{") != -1 else len(raw)),
        (raw.find("[") if raw.find("[") != -1 else len(raw)),
    )
    if start < len(raw):
        end_brace = raw.rfind("}")
        end_bracket = raw.rfind("]")
        end = max(end_brace, end_bracket)
        if end > start:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not parse JSON from Granite response: {raw[:200]}")
