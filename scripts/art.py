"""Author original cross-stitch tarot SVGs offline. Pillow is build-time tooling only."""
from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'art'
SOURCE = ROOT / 'src' / 'assets' / 'art-source'


def illustration(kind):
    im = Image.new('L', (192, 192), 0)
    d = ImageDraw.Draw(im)
    def poly(points, shade=235): d.polygon(points, fill=shade)
    def line(points, shade=235, width=4): d.line(points, fill=shade, width=width, joint='curve')
    def oval(box, shade=235): d.ellipse(box, fill=shade)
    if kind == 'sword':
        poly([(37,146),(48,149),(137,44),(153,12),(124,31)],245)
        poly([(47,139),(137,34),(137,44),(48,149)],100)
        poly([(25,125),(32,117),(75,151),(67,160)],210)
        line([(42,143),(22,170)],235,10)
        oval((12,163,29,180),180)
        for x,y in [(39,37),(142,129),(94,13)]:
            line([(x-8,y),(x+8,y)],150,2);line([(x,y-8),(x,y+8)],150,2)
    elif kind == 'chain':
        for x,y in [(56,48),(93,91),(131,135)]:
            oval((x-25,y-32,x+25,y+32),235)
            oval((x-14,y-20,x+14,y+20),0)
            line([(x-20,y-22),(x-20,y+15)],110,5)
        line([(60,63),(86,80)],250,8);line([(100,105),(124,122)],250,8)
    elif kind == 'tower':
        poly([(43,171),(54,58),(65,52),(60,27),(82,30),(85,49),(106,45),(107,19),(130,23),(129,52),(144,61),(153,171)],230)
        poly([(118,53),(144,61),(153,171),(114,171)],120)
        poly([(84,50),(99,80),(90,100),(106,117),(94,140),(110,170),(92,170),(79,136),(91,119),(75,99),(87,77)],0)
        for x,y in [(66,78),(118,85),(59,124),(125,137)]:d.rectangle((x,y,x+10,y+17),fill=0)
        line([(23,42),(38,35),(30,23)],180,3);line([(160,75),(177,68),(168,54)],180,3)
        poly([(19,173),(42,161),(55,180),(26,183)],135)
    elif kind == 'eye':
        poly([(12,95),(32,71),(60,54),(94,48),(130,57),(158,77),(180,97),(157,119),(128,136),(94,143),(61,137),(34,119)],240)
        poly([(20,95),(52,77),(93,67),(131,77),(172,97),(130,118),(93,128),(51,117)],75)
        oval((65,65,125,129),235);oval((81,77,109,119),0);oval((85,79,93,89),240)
        for x,y in [(45,47),(95,26),(146,46)]:line([(x,y),(x-4,y-15)],200,3)
        for x,y in [(47,145),(94,159),(145,146)]:line([(x,y),(x-2,y+13)],180,3)
    elif kind == 'masks':
        poly([(28,24),(79,19),(94,43),(89,65),(104,81),(88,89),(86,118),(67,133),(67,165),(20,169),(33,130),(24,109)],235)
        poly([(128,43),(169,36),(172,70),(163,88),(174,102),(156,107),(150,137),(132,144),(132,171),(96,169),(111,136),(105,100)],160)
        line([(40,54),(66,49)],40,6);line([(137,72),(155,72)],0,5)
        for x,y in [(87,105),(93,116),(99,127)]:oval((x,y,x+3,y+3),245)
        poly([(40,27),(63,24),(60,121),(43,113)],100)
    elif kind == 'serpent':
        oval((22,24,169,171),240);oval((49,50,143,144),0)
        poly([(29,96),(21,61),(40,32),(64,21),(88,22),(94,41),(73,59),(54,53)],245)
        oval((64,32,72,40),0)
        poly([(36,126),(50,137),(74,151),(100,157),(80,178),(50,163)],120)
        line([(91,29),(106,16),(119,20)],180,3)
        for a in range(25,325,22):
            x=96+63*math.cos(math.radians(a));y=96+63*math.sin(math.radians(a))
            line([(x-4,y-4),(x+4,y+4)],90,3)
    elif kind in ('crown','tiny_crown'):
        oval((61,65,132,141),210);poly([(67,126),(74,166),(120,166),(127,127)],180)
        poly([(42,67),(34,19),(67,40),(90,11),(117,40),(152,18),(144,67)],240)
        poly([(48,56),(141,56),(138,76),(51,76)],130)
        line([(76,99),(86,99)],0,5);line([(109,99),(119,99)],0,5)
        poly([(96,96),(105,117),(91,117)],65);line([(82,133),(112,133)],0,3)
        if kind=='tiny_crown':
            small=im.resize((122,122),Image.Resampling.NEAREST)
            im=Image.new('L',(192,192),0);im.paste(small,(60,55));d=ImageDraw.Draw(im)
            line([(17,19),(17,152),(60,175)],160,3)
            oval((7,8,26,27),230)
    elif kind in ('portal','door'):
        poly([(36,178),(36,47),(48,22),(72,10),(115,10),(142,26),(153,48),(153,178)],225)
        poly([(53,178),(53,48),(65,30),(89,24),(116,30),(132,47),(132,178)],0)
        if kind=='portal':
            poly([(61,173),(61,52),(78,35),(106,35),(125,52),(125,173)],140)
            oval((83,83,106,106),0);poly([(90,99),(99,99),(104,123),(85,123)],0)
        else:
            poly([(57,52),(110,32),(110,166),(57,177)],170)
            oval((91,101,99,109),0)
            for x,y in [(151,78),(154,96),(155,114)]:line([(x,y),(183,y-4)],210,3)
    elif kind=='moon':
        oval((28,21,170,166),225);oval((74,4,181,131),0)
        for box in [(47,65,66,83),(66,120,88,138),(40,104,48,112)]:oval(box,100)
        for x,y in [(133,58),(96,52),(156,136)]:
            poly([(x,y-11),(x+3,y-3),(x+11,y),(x+3,y+3),(x,y+11),(x-3,y+3),(x-11,y),(x-3,y-3)],245)
    elif kind=='process':
        for x,y,r in [(94,92,68),(94,92,42),(94,92,17)]:
            d.ellipse((x-r,y-r,x+r,y+r),outline=130,width=3)
        for a in range(0,360,45):
            x=94+84*math.cos(math.radians(a));y=92+84*math.sin(math.radians(a))
            line([(94,92),(x,y)],160,3);oval((x-7,y-7,x+7,y+7),235)
        poly([(64,54),(90,62),(108,48),(120,85),(107,116),(83,124),(63,108),(56,85)],240)
        line([(75,80),(85,80)],0,5);line([(98,80),(108,80)],0,5)
        line([(85,101),(105,101)],0,4)
    elif kind=='hand':
        poly([(66,182),(53,139),(35,111),(22,80),(27,72),(37,76),(57,108),(48,38),(54,28),(62,32),(73,86),(76,16),(84,10),(90,17),(91,84),(102,27),(111,23),(115,32),(110,93),(127,51),(137,47),(144,54),(130,109),(130,145),(114,180)],225)
        poly([(66,172),(56,136),(67,108),(80,103),(83,166)],100)
        poly([(70,116),(88,103),(107,108),(120,121),(101,133),(85,134)],0)
        oval((88,109,104,127),235);oval((94,113,100,123),0)
    return im


def svg_art(kind, frame):
    im=illustration(kind)
    marks=[]
    for y in range(4,188,3):
        for x in range(4,188,3):
            shade=im.getpixel((x,y))
            if shade<50:continue
            phase=(x//3+y//3)%4
            if shade<125 and phase>1:continue
            if shade<190 and phase==3:continue
            if (x//3+2*y//3)%5==0:
                marks.append(f'M{x},{y+1}h2.2m-1.1,-1.1v2.2')
            elif phase==1:
                marks.append(f'M{x},{y}l2,2m0,-2l-2,2')
            else:
                marks.append(f'M{x},{y}h1.5v1.5h-1.5Z')
    ornaments=''
    if frame:
        ornaments='<path d="M10 31V10h21M161 10h21v21M182 161v21h-21M31 182H10v-21" fill="none" stroke="#151319" stroke-width="1"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><title>Original cross-stitch tarot illustration</title>'+ornaments+'<path d="'+' '.join(marks)+'" fill="#151319" stroke="#151319" stroke-width=".55"/></svg>'


mapping={'pain-threats':'sword','pain-guilt':'chain','pain-chaos':'tower','pain-questions':'eye','pain-gossip':'masks','pain-meetings':'serpent','card_01':'crown','card_02':'serpent','card_03':'tower','card_04':'chain','card_05':'eye','card_06':'masks','card_07':'tiny_crown','card_08':'portal','card_09':'moon','card_10':'process','card_11':'hand','card_12':'door'}
for name,kind in mapping.items():
    art=svg_art(kind,name.startswith('card_'))
    for folder in (OUT,SOURCE):
        folder.mkdir(parents=True,exist_ok=True)
        (folder/(name+'.svg')).write_text(art)
print('Authored 18 original cross-stitch SVG illustrations; no network or fonts')
