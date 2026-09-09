#!/bin/sh
# Smoke test pentru interfata Libra Maker: parcurge tot fluxul si verifica textele cheie.
set -e
apk add --no-cache curl >/dev/null 2>&1

cd /app
go build -o /tmp/lm ./backend/cmd/server
/tmp/lm -addr 127.0.0.1:8080 >/tmp/server.log 2>&1 &
sleep 1

J=/tmp/cookies
fail=0

check() { # check <eticheta> <fisier> <text asteptat>
  if grep -qi "$3" "$2"; then
    echo "OK   $1"
  else
    echo "FAIL $1 (lipseste: $3)"
    fail=1
  fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "--- 01 login"
curl -s http://127.0.0.1:8080/login > /tmp/login.html
check "login: titlu"    /tmp/login.html "Pagini interne,"
check "login: buton"    /tmp/login.html "Continuă cu contul companiei"
check "login: css"      /tmp/login.html "/static/css/app.css"

echo "--- auth"
curl -s -c $J -o /dev/null -w 'sso=%{http_code} ' -X POST http://127.0.0.1:8080/auth/sso
echo ""

echo "--- 02 acasa"
curl -s -b $J http://127.0.0.1:8080/acasa > /tmp/home.html
check "acasa: salut"      /tmp/home.html "Ce construim azi, Ana?"
check "acasa: statistici" /tmp/home.html "timp mediu"
check "acasa: 42s"        /tmp/home.html "42s"
check "acasa: predat"     /tmp/home.html "Predat la Dev"
check "acasa: ciorna"     /tmp/home.html "Ciornă"
check "acasa: finalizat"  /tmp/home.html "Finalizat"
check "acasa: green week" /tmp/home.html "Green Week"

echo "--- cautare (fragment HTMX)"
curl -s -b $J "http://127.0.0.1:8080/proiecte/cauta?q=cantina" > /tmp/search.html
check "cautare: gaseste"  /tmp/search.html "Chestionar cantină"
if grep -q "Green Week" /tmp/search.html; then echo "FAIL cautare: nu a filtrat"; fail=1; else echo "OK   cautare: a filtrat"; fi

echo "--- 03 instrument"
curl -s -b $J http://127.0.0.1:8080/proiect-nou > /tmp/tools.html
check "instrument: titlu"   /tmp/tools.html "Alege unul din cele două instrumente"
check "instrument: skill 1" /tmp/tools.html "Pagină de informare"
check "instrument: skill 2" /tmp/tools.html "Formular de colectare"
check "instrument: limite"  /tmp/tools.html "CE NU POATE FACE"

echo "--- 03 validare fara selectie"
curl -s -b $J -H "HX-Request: true" -X POST http://127.0.0.1:8080/proiect-nou/instrument > /tmp/toolerr.html
check "validare: mesaj" /tmp/toolerr.html "Alege unul dintre cele două instrumente"

echo "--- 03 selectie valida"
curl -s -b $J -D /tmp/h1 -o /dev/null -H "HX-Request: true" -X POST -d "skill_id=formular" http://127.0.0.1:8080/proiect-nou/instrument
check "selectie: HX-Redirect" /tmp/h1 "HX-Redirect: /proiect-nou/detalii?skill=formular"

echo "--- 04 detalii"
curl -s -b $J "http://127.0.0.1:8080/proiect-nou/detalii?skill=formular" > /tmp/details.html
check "detalii: titlu"    /tmp/details.html "Spune-ne ce vrei să conțină pagina"
check "detalii: pilula"   /tmp/details.html "Formular"
check "detalii: contor"   /tmp/details.html "data-counter-for"
check "detalii: ghidaj"   /tmp/details.html "Trei detalii care ajută mult"

echo "--- 04 validare descriere scurta"
curl -s -b $J -H "HX-Request: true" -X POST \
  -d "skill_id=formular&name=Test proiect&description=scurt" \
  http://127.0.0.1:8080/proiect-nou/detalii > /tmp/deterr.html
check "validare: descriere" /tmp/deterr.html "Scrie câteva rânduri"

echo "--- 04 trimitere valida"
curl -s -b $J -D /tmp/h2 -o /dev/null -H "HX-Request: true" -X POST \
  --data-urlencode "skill_id=formular" \
  --data-urlencode "name=Green Week 2026" \
  --data-urlencode "description=O pagina pentru campania interna Green Week, cu punctele de reciclare si un formular de inscriere." \
  http://127.0.0.1:8080/proiect-nou/detalii
PROJ=$(grep -i "^HX-Redirect:" /tmp/h2 | tr -d '\r' | sed 's|.*/proiect/||')
echo "proiect creat: $PROJ"
[ -n "$PROJ" ] || { echo "FAIL nu s-a creat proiectul"; exit 1; }

echo "--- ecran de asteptare"
curl -s -b $J "http://127.0.0.1:8080/proiect/$PROJ" > /tmp/gen.html
check "asteptare: titlu" /tmp/gen.html "Construim pagina"
check "asteptare: poll"  /tmp/gen.html "/status"

echo "status in timpul rularii: $(code -b $J http://127.0.0.1:8080/proiect/$PROJ/status) (asteptat 204)"
sleep 4
curl -s -b $J -D /tmp/h3 -o /dev/null http://127.0.0.1:8080/proiect/$PROJ/status
check "poll dupa generare: redirect" /tmp/h3 "Location: /proiect/$PROJ"

echo "--- 05 rezultat"
curl -s -b $J "http://127.0.0.1:8080/proiect/$PROJ" > /tmp/result.html
check "rezultat: titlu"     /tmp/result.html "Pagina ta e pregătită"
check "rezultat: fisier"    /tmp/result.html "green-week-2026.html"
check "rezultat: buton"     /tmp/result.html "Trimite la echipa Dev"
check "rezultat: panou"     /tmp/result.html "Nimic nu se publică singur"

echo "--- 06 handoff"
curl -s -b $J -D /tmp/h4 -o /dev/null -H "HX-Request: true" -X POST "http://127.0.0.1:8080/proiect/$PROJ/handoff"
check "handoff: redirect" /tmp/h4 "HX-Redirect: /proiect/$PROJ/predat"
curl -s -b $J "http://127.0.0.1:8080/proiect/$PROJ/predat" > /tmp/handoff.html
check "handoff: titlu"    /tmp/handoff.html "Trimis echipei de dezvoltare"
check "handoff: skill"    /tmp/handoff.html "Formular de colectare v1"
check "handoff: solicitant" /tmp/handoff.html "ana.popescu · Administrativ"
check "handoff: stadiu"   /tmp/handoff.html "În revizuire tehnică"
check "handoff: reguli"   /tmp/handoff.html "Fără cale de ocolire"

echo "--- ajutor + statice"
curl -s -b $J http://127.0.0.1:8080/ajutor > /tmp/help.html
check "ajutor: titlu" /tmp/help.html "Cum funcționează Libra Maker"
echo "css=$(code http://127.0.0.1:8080/static/css/app.css) js=$(code http://127.0.0.1:8080/static/js/htmx.min.js) app=$(code http://127.0.0.1:8080/static/js/app.js)"

echo "--- acces neautentificat"
echo "acasa fara cookie: $(code http://127.0.0.1:8080/acasa) (asteptat 303)"

echo ""
if [ "$fail" = "0" ]; then echo "SMOKE_OK"; else echo "SMOKE_FAILED"; fi
