from pathlib import Path
import json,base64
root=Path(__file__).parent/'dist'
data=lambda s:'data:text/javascript;base64,'+base64.b64encode(s.encode()).decode()
imports={}
imports['qiju-three-core']=data((root/'vendor/three.core.js').read_text())
imports['qiju-three']=data((root/'vendor/three.module.js').read_text().replace("'./three.core.js'","'qiju-three-core'"))
for name,path in [('qiju-supabase','supabase-sync.js'),('qiju-protocol','sync-protocol.js'),('qiju-sync','shared-sync.js'),('qiju-spatial','spatial.js'),('qiju-model','model3d.js'),('qiju-viewer','viewer3d.js')]:
 s=(root/path).read_text().replace("'./sync-protocol.js'","'qiju-protocol'").replace("'./vendor/three.module.js'","'qiju-three'").replace("'./model3d.js'","'qiju-model'").replace("'./spatial.js'","'qiju-spatial'")
 imports[name]=data(s)
app=(root/'app.js').read_text().replace("'./sync-protocol.js'","'qiju-protocol'").replace("'./supabase-sync.js'","'qiju-supabase'").replace("'./shared-sync.js'","'qiju-sync'").replace("'./viewer3d.js'","'qiju-viewer'").replace("'./spatial.js'","'qiju-spatial'")
for i in range(2): app=app.replace(f'assets/room-{i}.jpeg','data:image/jpeg;base64,'+base64.b64encode((root/f'assets/room-{i}.jpeg').read_bytes()).decode())
s=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
s=s.replace('<script src="geometry.js"></script>','<script>'+(root/'geometry.js').read_text()+'</script>')
s=s.replace('<script type="module" src="app.js"></script>','<script type="importmap">'+json.dumps({'imports':imports})+'</script><script type="module">'+app+'</script>')
(root.parent.parent/'栖居-软装布置.html').write_text(s)
print('Offline HTML regenerated')
