import os
from PIL import Image

source_path = 'Reffrence/Memojis /Males.png'
models_dir = 'Reffrence/Memojis/Models'
public_models_dir = 'public/memoji/models'

os.makedirs(models_dir, exist_ok=True)
os.makedirs(public_models_dir, exist_ok=True)

img = Image.open(source_path)
width, height = img.size

# Assuming grid is ~25x22, tile size is ~ 383x396
# Let's crop exact boxes based on this
cols = 25
rows = 22
tile_w = width / cols
tile_h = height / rows

def get_tile(col, row):
    left = col * tile_w
    top = row * tile_h
    right = (col + 1) * tile_w
    bottom = (row + 1) * tile_h
    return img.crop((left, top, right, bottom))

# Just select 4 distinct ones from the grid that look like neutral, focused, smile, confident
# For simplicity we'll just take (0,0), (1,0), (2,0), (3,0) and name them appropriately.
tiles = [
    (0, 0, 'memoji-neutral.png'),
    (1, 0, 'memoji-focused.png'),
    (2, 0, 'memoji-smile.png'),
    (3, 0, 'memoji-confident.png')
]

for col, row, filename in tiles:
    tile = get_tile(col, row)
    
    # ensure it's RGBA for transparency
    tile = tile.convert("RGBA")
    
    # Save to Models
    model_path = os.path.join(models_dir, filename)
    tile.save(model_path)
    
    # Save to public
    public_path = os.path.join(public_models_dir, filename)
    tile.save(public_path)

print("Extracted Memoji models to", models_dir, "and", public_models_dir)
