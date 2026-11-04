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
    elif kind=='key':
        oval((31,27,98,94),230);oval((46,42,83,79),0)
        line([(82,82),(152,154)],235,17);line([(127,130),(112,146)],225,10);line([(146,148),(134,164)],225,10)
    elif kind=='garden':
        line([(94,174),(94,36)],210,9)
        for x,y in [(45,60),(111,92),(49,120)]:
            oval((x,y,x+40,y+22),240);line([(x+20,y+11),(94,y+30)],180,4)
        poly([(47,157),(142,157),(128,183),(63,183)],180)
    elif kind=='choice':
        line([(95,178),(95,99),(43,50)],230,11);line([(95,99),(149,50)],230,11)
        for x in (30,136):
            oval((x,22,x+26,48),210);poly([(x,35),(x+13,65),(x+26,35)],210)
    elif kind=='lion':
        poly([(94,10),(119,31),(150,35),(160,65),(181,91),(159,117),(151,153),(119,161),(94,182),(67,161),(35,154),(28,119),(8,94),(27,69),(36,36),(64,29)],145)
        oval((43,41,148,151),235);line([(62,77),(79,77)],0,6);line([(111,77),(130,77)],0,6)
        poly([(82,99),(109,99),(96,116)],0);line([(96,117),(96,135)],0,4)
    elif kind=='hourglass':
        line([(42,20),(151,20)],230,11);line([(42,174),(151,174)],230,11)
        poly([(53,30),(139,30),(131,69),(107,98),(133,133),(141,166),(51,166),(59,133),(83,98),(59,69)],200)
        poly([(66,37),(126,37),(120,63),(96,91),(72,63)],0)
        poly([(64,158),(96,120),(128,158)],0)
    elif kind=='archive':
        poly([(24,59),(24,35),(82,35),(103,53),(169,53),(169,164),(24,164)],230)
        poly([(36,73),(178,73),(158,168),(18,168)],140)
        line([(98,105),(98,150)],0,4);oval((84,93,111,116),235)
    elif kind=='pour':
        for x,y in [(25,37),(118,110)]:
            poly([(x,y),(x+49,y),(x+42,y+39),(x+8,y+39)],230)
            line([(x+14,y+42),(x+36,y+42)],140,6)
        line([(60,64),(87,84),(104,81),(133,107)],220,6)
    elif kind=='star':
        pts=[]
        for i in range(16):
            r=82 if i%2==0 else 23;a=i*math.pi/8-math.pi/2;pts.append((96+r*math.cos(a),96+r*math.sin(a)))
        poly(pts,240);oval((80,80,112,112),100)
    elif kind=='sun':
        for a in range(0,360,30):
            x=96+72*math.cos(math.radians(a));y=96+72*math.sin(math.radians(a));line([(x,y),(96+86*math.cos(math.radians(a)),96+86*math.sin(math.radians(a)))],230,7)
        oval((42,42,150,150),230);line([(62,84),(80,84)],0,5);line([(110,84),(128,84)],0,5)
        line([(75,115),(95,125),(117,113)],0,4)
    elif kind=='world':
        oval((27,27,165,165),220);oval((36,36,156,156),0)
        line([(95,36),(95,156)],170,3);line([(36,96),(156,96)],170,3)
        poly([(55,48),(87,43),(100,66),(86,88),(69,85),(68,113),(53,104)],230)
        poly([(118,90),(145,101),(138,137),(119,149),(107,123)],230)
    return im


def svg_art(kind, frame, im=None):
    if im is None: im=illustration(kind)
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


mapping={'pain-threats':'sword','pain-guilt':'chain','pain-chaos':'tower','pain-questions':'eye','pain-gossip':'masks','pain-meetings':'serpent','card_01':'crown','card_02':'serpent','card_03':'tower','card_04':'chain','card_05':'eye','card_06':'masks','card_07':'tiny_crown','card_08':'portal','card_09':'moon','card_10':'process','card_11':'hand','card_12':'door','card_13':'key','card_14':'garden','card_15':'choice','card_16':'lion','card_17':'hourglass','card_18':'archive','card_19':'pour','card_20':'star','card_21':'sun','card_22':'world'}
for name,kind in mapping.items():
    art=svg_art(kind,name.startswith('card_'))
    for folder in (OUT,SOURCE):
        folder.mkdir(parents=True,exist_ok=True)
        (folder/(name+'.svg')).write_text(art)
print('Authored original major arcana and pain illustrations; no network or fonts')


def minor_art(suit,rank):
    im=Image.new('L',(192,192),0);d=ImageDraw.Draw(im)
    def pip(x,y,r):
        if suit=='swords':
            d.polygon([(x,y-r),(x+r*.25,y+r*.4),(x,y+r*.6),(x-r*.25,y+r*.4)],fill=235);d.line([(x-r*.55,y+r*.5),(x+r*.55,y+r*.5)],fill=140,width=3);d.line([(x,y+r*.5),(x,y+r)],fill=220,width=3)
        elif suit=='cups':
            d.polygon([(x-r*.7,y-r*.7),(x+r*.7,y-r*.7),(x+r*.5,y+r*.2),(x-r*.5,y+r*.2)],fill=225);d.line([(x,y+r*.2),(x,y+r*.8)],fill=190,width=3);d.line([(x-r*.5,y+r*.8),(x+r*.5,y+r*.8)],fill=225,width=3)
        elif suit=='wands':
            d.line([(x-r*.35,y+r),(x+r*.3,y-r)],fill=220,width=5);d.ellipse((x-r*.3,y-r*.4,x+r*.5,y+r*.1),fill=145)
        else:
            d.ellipse((x-r,y-r,x+r,y+r),fill=180);pts=[]
            for i in [0,2,4,1,3,0]:pts.append((x+r*.7*math.cos(i*math.pi*2/5-math.pi/2),y+r*.7*math.sin(i*math.pi*2/5-math.pi/2)))
            d.line(pts,fill=245,width=2)
    if rank<=10:
        if rank==1:positions=[(96,96)];r=52
        else:
            cols=2 if rank<9 else 3;rows=math.ceil(rank/cols);r=min(22,60/rows);positions=[]
            for i in range(rank):
                row=i//cols;count=min(cols,rank-row*cols);x=96 if count==1 else 46+(i%cols)*100/(count-1);y=96 if rows==1 else 35+row*122/(rows-1);positions.append((x,y))
        for x,y in positions:pip(x,y,r)
    else:
        d.ellipse((58,31,132,108),fill=160+rank*4);d.polygon([(49,174),(62,110),(126,110),(145,174)],fill=140)
        if rank>=13:d.polygon([(57,38),(52,13),(77,25),(96,7),(115,25),(140,13),(133,38)],fill=235)
        elif rank==12:d.line([(64,42),(125,42),(145,62)],fill=240,width=8)
        else:d.polygon([(59,37),(110,15),(134,38)],fill=240)
        d.line([(72,66),(83,66)],fill=0,width=4);d.line([(110,66),(121,66)],fill=0,width=4)
        if rank==14:d.polygon([(72,93),(120,93),(96,121)],fill=235)
        pip(96,139,25)
    return im
for suit in ['swords','cups','wands','pentacles']:
    for rank in range(1,15):
        art=svg_art('',True,minor_art(suit,rank));name=f'card_{suit}_{rank:02}.svg'
        for folder in (OUT,SOURCE):(folder/name).write_text(art)
print('Full deck: 78 original card illustrations plus 6 pain illustrations')
