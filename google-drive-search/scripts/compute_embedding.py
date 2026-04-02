"""
CLIP embedding計算サーバー（stdin/stdout通信）
"""
import sys
import json
import torch
import numpy as np
from PIL import Image

# パノラマ等の巨大画像の警告を抑止
Image.MAX_IMAGE_PIXELS = None
from transformers import CLIPProcessor, CLIPModel

def main():
    print("Loading CLIP model...", file=sys.stderr, flush=True)
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
    model.eval()
    print("CLIP model loaded.", file=sys.stderr, flush=True)

    # 準備完了シグナル
    print("READY", flush=True)

    for line in sys.stdin:
        image_path = line.strip()
        if not image_path:
            continue
        try:
            image = Image.open(image_path).convert("RGB")
            inputs = processor(images=image, return_tensors="pt")
            with torch.no_grad():
                vision_outputs = model.vision_model(pixel_values=inputs["pixel_values"])
                image_embeds = model.visual_projection(vision_outputs.pooler_output)
            embedding = image_embeds[0].numpy()
            embedding = embedding / np.linalg.norm(embedding)
            result = {"embedding": embedding.tolist()}
        except Exception as e:
            result = {"error": str(e)}

        print(json.dumps(result), flush=True)

if __name__ == "__main__":
    main()
