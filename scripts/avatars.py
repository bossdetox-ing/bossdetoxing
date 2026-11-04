"""Trace the owner-supplied pixel contact sheet into 30 local SVG logos."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'.design-references/avatars-contact-sheet.png'
im=Image.open(source).convert('L')
cols=[(90,277),(328,520),(580,762),(814,985),(1033,1218),(1262,1462)]
rows=[(42,207),(238,437),(457,637),(655,828),(829,995)]
out=ROOT/'public/avatars';out.mkdir(exist_ok=True)
for row,(top,bottom) in enumerate(rows):
 for col,(left,right) in enumerate(cols):
  part=im.crop((left,top,right,bottom));runs={};rects=[]
  for y in range(part.height):
   current=[];x=0
   while x<part.width:
    if part.getpixel((x,y))>=128:x+=1;continue
    start=x
    while x<part.width and part.getpixel((x,y))<128:x+=1
    current.append((start,x))
   active={}
   for start,end in current:
    key=(start,end);old=runs.pop(key,None)
    active[key]=(old[0],old[1]+1) if old else (y,1)
   for (start,end),(first,height) in runs.items():rects.append((start,first,end-start,height))
   runs=active
  for (start,end),(first,height) in runs.items():rects.append((start,first,end-start,height))
  data=' '.join(f'M{x+5} {y+5}h{w}v{h}h{-w}Z' for x,y,w,h in rects)
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {part.width+10} {part.height+10}" shape-rendering="crispEdges"><path fill="#151319" d="{data}"/></svg>'
  (out/f'{row*6+col+1:02}.svg').write_text(svg)
print('Traced all 30 owner-supplied pixel avatars to SVG')
