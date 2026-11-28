"""Submit a first pixel-art test workflow to a local ComfyUI server.

Usage:
  python scripts/comfy_pixel_test.py --mode text2img
  python scripts/comfy_pixel_test.py --mode img2img

Requires ComfyUI running at http://127.0.0.1:8188 with:
  - checkpoints/dreamshaper_8.safetensors
  - loras/PixelArtRedmond15V-PixelArt-PIXARFK.safetensors
  - input/a-shell-768x432.png (for img2img)
"""
import argparse
import json
import time
import urllib.error
import urllib.request

SERVER = "http://127.0.0.1:8188"
CHECKPOINT = "dreamshaper_8.safetensors"
LORA = "PixelArtRedmond15V-PixelArt-PIXARFK.safetensors"

POSITIVE = (
    "pixel art, PixArFK, empty modern room interior, large plain wall, "
    "big window with a sunny green valley and low-rise suburban houses, "
    "modern dark door, grey microcement floor, soft daylight, "
    "clean flat colour bands, crisp hard edges, 16-bit game background, "
    "no furniture, no people, no text, no logo"
)
NEGATIVE = (
    "photo, photorealistic, 3d render, blurry, soft gradients, anti-aliasing, "
    "random noise, clutter, furniture, wood grain, people, text, watermark, ui, "
    "high detail, painterly"
)


def base_workflow(mode: str, seed: int, denoise: float) -> dict:
    workflow = {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": CHECKPOINT},
        },
        "2": {
            "class_type": "LoraLoader",
            "inputs": {
                "model": ["1", 0],
                "clip": ["1", 1],
                "lora_name": LORA,
                "strength_model": 0.9,
                "strength_clip": 0.9,
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": POSITIVE, "clip": ["2", 1]},
        },
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": NEGATIVE, "clip": ["2", 1]},
        },
        "7": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 28,
                "cfg": 7.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": denoise,
                "model": ["2", 0],
                "positive": ["3", 0],
                "negative": ["4", 0],
                "latent_image": ["6", 0],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["7", 0], "vae": ["1", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": f"pixel-shell-{mode}",
                "images": ["8", 0],
            },
        },
    }
    if mode == "img2img":
        workflow["5"] = {
            "class_type": "LoadImage",
            "inputs": {"image": "a-shell-768x432.png"},
        }
        workflow["6"] = {
            "class_type": "VAEEncode",
            "inputs": {"pixels": ["5", 0], "vae": ["1", 2]},
        }
    else:
        workflow["6"] = {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": 768, "height": 432, "batch_size": 1},
        }
    return workflow


def post_json(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        SERVER + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(path: str) -> dict:
    with urllib.request.urlopen(SERVER + path, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_result(prompt_id: str, timeout: float = 900.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        history = get_json(f"/history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
    raise TimeoutError(f"ComfyUI prompt {prompt_id} did not finish in {timeout}s")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["text2img", "img2img"], default="img2img")
    parser.add_argument("--seed", type=int, default=12345)
    parser.add_argument("--denoise", type=float, default=0.55)
    args = parser.parse_args()

    print(f"Checking ComfyUI at {SERVER} ...")
    try:
        stats = get_json("/system_stats")
        print("ComfyUI:", stats.get("system", {}).get("comfyui_version", "unknown"))
    except urllib.error.URLError as error:
        raise SystemExit(
            "ComfyUI is not reachable. Start it first, then rerun this script."
        ) from error

    workflow = base_workflow(args.mode, args.seed, args.denoise)
    response = post_json("/prompt", {"prompt": workflow, "client_id": "pixel-test"})
    prompt_id = response.get("prompt_id")
    if not prompt_id:
        raise SystemExit(f"Unexpected /prompt response: {response}")

    print(f"Queued {args.mode} prompt {prompt_id}; waiting ...")
    result = wait_for_result(prompt_id)
    print(json.dumps(result.get("outputs", {}), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
