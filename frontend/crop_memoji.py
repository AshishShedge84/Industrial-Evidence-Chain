import os
from PIL import Image

img = Image.open('Reffrence/Memojis /Characters.png')
w, h = img.size

os.makedirs('public/memoji', exist_ok=True)

# 2230 x 991
col_w = w // 5 # 446
row_h = h // 2 # 495

count = 1
for r in range(2):
    for c in range(5):
        box = (c*col_w, r*row_h, (c+1)*col_w, (r+1)*row_h)
        crop = img.crop(box)
        
        # trim transparency
        bbox = crop.getbbox()
        if bbox:
            crop = crop.crop(bbox)
            crop.save(f'public/memoji/frame_{count}.png')
            count += 1
            if count > 5:
                break
    if count > 5:
        break
print(f"Extracted {count-1} frames.")
