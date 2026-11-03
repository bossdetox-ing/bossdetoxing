"""Original local geometric engraving assets. No network, credentials or generative service."""
from pathlib import Path
from PIL import Image, ImageDraw
import math
root=Path(__file__).resolve().parents[1]
out=root/'public/art'; out.mkdir(exist_ok=True)
source=root/'src/assets/art-source'; source.mkdir(parents=True,exist_ok=True)
class Art:
    def __init__(self):
        self.im=Image.new('RGB',(640,640),(16,17,19)); self.d=ImageDraw.Draw(self.im); self.svg=[]
    def line(self,points,red=False,w=2):
        color='#eb3541' if red else '#eeeef0'; scaled=[(x*4,y*4) for x,y in points]
        self.d.line(scaled,fill=color,width=w*4,joint='curve')
        self.svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    def circle(self,x,y,r,red=False,w=1):
        color='#eb3541' if red else '#eeeef0'; self.d.ellipse(((x-r)*4,(y-r)*4,(x+r)*4,(y+r)*4),outline=color,width=w*4)
        self.svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{color}" stroke-width="{w}"/>')
    def orbit(self,r=55):
        for a in range(0,360,15):
            x=80+r*math.cos(math.radians(a)); y=80+r*math.sin(math.radians(a)); self.circle(x,y,.6)
    def hatch(self,x,y,n=7):
        for i in range(n): self.line([(x+i*3,y),(x+i*3+8,y-12)],w=1)
    def save(self,name):
        self.im.resize((512,512),Image.Resampling.LANCZOS).save(out/(name+'.webp'),'WEBP',quality=92,method=6)
        (source/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#101113"/>'+''.join(self.svg)+'</svg>')
def draw(kind):
    a=Art(); a.orbit()
    if kind=='sword':
        a.line([(80,20),(80,128)]); a.line([(59,45),(80,20),(101,45)]); a.line([(67,39),(80,27),(93,39)]); a.line([(61,110),(99,110)]); a.line([(73,128),(87,128)]); a.line([(21,80),(39,80)],True); a.line([(121,80),(139,80)],True); a.hatch(73,104,4)
    elif kind=='weight':
        a.circle(80,83,40); a.line([(80,18),(80,125)]); a.line([(51,53),(109,113)]); a.line([(109,53),(51,113)]); a.circle(80,83,11); a.line([(37,104),(123,104)],True); a.hatch(60,51,5)
    elif kind=='altar':
        a.line([(28,123),(55,123),(55,103),(106,103),(106,83),(128,83)]); a.line([(36,121),(75,35),(94,72),(115,32),(133,121)],True); a.line([(42,92),(118,92)]); a.hatch(64,122,13)
    elif kind=='question':
        a.circle(80,77,42); a.line([(62,66),(62,51),(74,42),(90,43),(100,55),(99,68),(81,84),(81,101)]); a.circle(81,117,3,True); a.line([(19,77),(33,77)]); a.line([(127,77),(141,77)]); a.hatch(47,101,5)
    elif kind=='voices':
        a.circle(62,49,12); a.circle(101,49,12); a.line([(29,113),(36,86),(49,74),(65,72),(80,80),(91,113)]); a.line([(64,113),(73,87),(89,74),(105,74),(121,87),(129,113)]); a.line([(42,123),(121,123)],True); a.hatch(45,111,7)
    elif kind=='loop':
        a.circle(80,80,42); a.circle(80,80,7); a.line([(48,79),(51,61),(64,48),(82,44),(100,49)],True); a.line([(100,49),(82,49)] ,True); a.line([(100,49),(100,31)],True); a.line([(112,81),(109,99),(94,113),(77,117),(59,110)],True); a.line([(59,110),(78,110)],True); a.line([(59,110),(59,129)],True)
    elif kind=='crown':
        a.line([(39,76),(39,49),(58,61),(80,36),(102,61),(121,49),(121,76),(39,76)]); a.line([(44,86),(117,86)],True); a.line([(80,89),(80,125)]); a.line([(43,125),(118,125)]); a.hatch(45,76,22)
    elif kind=='audience':
        for x,y in [(44,99),(80,112),(116,99)]:
            a.circle(x,y-22,9); a.line([(x-14,y+15),(x-10,y-5),(x+10,y-5),(x+14,y+15)])
        a.line([(61,46),(61,29),(80,40),(99,29),(99,46),(61,46)],True); a.line([(80,53),(80,66)],True)
    elif kind=='chain':
        for x,y in [(56,56),(79,77),(102,98)]: a.circle(x,y,20); a.line([(x-5,y-19),(x+9,y-11)],True)
        a.line([(57,121),(105,121)]); a.hatch(57,121,13)
    elif kind=='portal':
        a.line([(43,127),(43,59),(54,39),(80,28),(106,39),(117,59),(117,127)]); a.line([(56,127),(56,64),(64,48),(80,40),(96,48),(104,64),(104,127)]); a.circle(80,83,6); a.line([(80,88),(80,104)],True); a.line([(34,129),(126,129)])
    elif kind=='paper':
        a.circle(78,78,40); a.line([(92,39),(77,58),(69,80),(79,105),(95,119)]); a.line([(47,62),(65,62)],True); a.line([(43,75),(63,75)]); a.line([(45,88),(62,88)]); a.line([(52,101),(70,101)]); a.hatch(92,108,6)
    elif kind=='process':
        for x,y in [(80,33),(48,72),(112,72),(40,117),(80,117),(123,117)]: a.line([(x-10,y-8),(x+10,y-8),(x+10,y+8),(x-10,y+8),(x-10,y-8)])
        a.line([(80,41),(80,53),(48,53),(48,64)]); a.line([(80,53),(112,53),(112,64)]); a.line([(48,80),(40,109)]); a.line([(112,80),(80,109)],True); a.line([(112,80),(123,109)]); a.line([(29,133),(136,26)],True,w=1)
    elif kind=='mirror':
        a.line([(51,120),(51,44),(61,31),(89,31),(99,44),(99,120),(51,120)]); a.line([(61,105),(88,49)]); a.line([(63,81),(76,52)],True); a.line([(42,130),(111,130)]); a.line([(109,94),(133,94),(133,124),(109,124),(109,94)]); a.hatch(112,119,5)
    elif kind=='door':
        a.line([(42,128),(42,32),(117,32),(117,128)]); a.line([(57,128),(57,46),(104,34),(104,120),(57,128)]); a.circle(92,82,2,True); a.line([(30,131),(131,131)],True); a.hatch(43,127,5)
    return a
mapping={'pain-threats':'sword','pain-guilt':'weight','pain-chaos':'altar','pain-questions':'question','pain-gossip':'voices','pain-meetings':'loop','card_01':'crown','card_02':'loop','card_03':'altar','card_04':'chain','card_05':'question','card_06':'voices','card_07':'audience','card_08':'portal','card_09':'paper','card_10':'process','card_11':'mirror','card_12':'door'}
for name,kind in mapping.items():
    art=draw(kind)
    if name.startswith('card_'): art.circle(80,80,67,w=1); art.line([(17,146),(143,146)],True,w=1)
    art.save(name)
print('Created 18 original offline vector/raster artwork assets')
