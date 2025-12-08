from PIL import Image
import os, zipfile

# reopen sheet and slice again
sheet_path = "all_symbols.png"
img = Image.open(sheet_path)
w,h = img.size
cols, rows = 3,3
cell_w, cell_h = w//cols, h//rows

tiles = []
for r in range(rows):
    for c in range(cols):
        left = c*cell_w
        top = r*cell_h
        right = left+cell_w
        bottom = top+cell_h
        tiles.append(img.crop((left,top,right,bottom)))

# map indices to symbol names based on visual layout
mapping = {
    0: "8",
    1: "9",
    2: "10",
    3: "Q",
    4: "K",
    5: "A",
    7: "Star",
}

out_dir = "./"
os.makedirs(out_dir, exist_ok=True)

saved_paths = {}

for idx, name in mapping.items():
    tile = tiles[idx]
    tile = tile.resize((150,150))
    path = os.path.join(out_dir, f"{name}.png")
    tile.save(path)
    saved_paths[name] = path

# add separate J image
j_src = "j_symbol.png"
j_img = Image.open(j_src)
# center-crop to square if needed
jw,jh = j_img.size
side = min(jw,jh)
left = (jw - side)//2
top = (jh - side)//2
j_crop = j_img.crop((left, top, left+side, top+side))
j_crop = j_crop.resize((150,150))
j_path = os.path.join(out_dir, "J.png")
j_crop.save(j_path)
saved_paths["J"] = j_path

