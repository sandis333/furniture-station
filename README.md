# Sakomplektētās furnitūras izņemšanas stacija

Lokālā FastAPI stacijas aplikācija. Tajā vispirms izvēlas MBK vai KPA sarakstu,
pēc tam tā ielādē atbilstošos pasūtījumus un artikulus no Lācis API,
ļauj izvēlēties pilno komplektu skaitu un reģistrē izņemšanu tikai pēc visu
izvēlētajai opcijai nepieciešamo KID datamatrix noskenēšanas.

## Konfigurācija

1. Nokopējiet `.env.example` kā `.env`.
2. Norādiet skenera `SERIAL_PORT`, Lācis API adresi, bearer tokenu un `STATION_ID`.
3. `STATION_ID` jābūt aktīvam `Skapis.dbo.stac_stacijas`, un tajā jābūt
   norādītai stacijas IP adresei.

Furnitūras izņemšanas sesiju un audita tabulas, kā arī `SP_FIS_*` procedūras
atrodas `FurStac` datubāzē. Procedūras ražošanas datus lasa no `Druva` un
staciju/lietotāju datus no `Skapis`.

`BASE_URL` jābeidzas ar `/furnituras_iznemsanas_stacija`.

## Kartes lasītājs

Stacijas UI sākotnēji ir bloķēts ar pulksteni pa visu ekrānu. Tas tiek atbloķēts
tikai pēc autorizētas kartiņas novietošanas un atkārtoti bloķēts pēc kartiņas
noņemšanas vai tiesību pārbaudes kļūdas.

Universālā `card_reader` servisa `.env` failā norādiet:

```text
BASE_URL=http://<lacis-api>:5001/card_reader
STATION_ID=<tas pats stacijas ID>
STATUS_CALLBACK_URL=http://127.0.0.1:8000/api/update-card-status
```

Lietotājam jābūt piešķirtai šai stacijai atbilstošai tiesībai tabulā
`Druva.dbo.user_allowed_stations`. Lācis API katram furnitūras pieprasījumam
papildus pārbauda aktīvo kartiņu un tiesības. Sesijā un skenējumu auditā tiek
saglabāts darbinieka ID.

## Palaišana

Windows:

```text
setup.bat
dev.bat
```

Raspberry Pi/Linux:

```text
chmod +x setup.sh dev.sh restart.sh start_app.sh
./setup.sh
./dev.sh
```

Stacijas UI būs pieejams `http://127.0.0.1:8000`.
