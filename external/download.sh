#!/bin/bash

mkdir dl

# AnnoFCConverter.exe, v1.40+3, https://github.com/taubenangriff/AnnoFCConverter/tree/58226f3358186c509c3c4ffaa4e73f5ad22a077a
# informal permission to bundle with the extension
# no download as there's no public release for it

# texconv.exe, MIT
curl -L https://github.com/microsoft/DirectXTex/releases/download/sept2021/texconv.exe > ./texconv.exe

# xmltest.exe, MIT
curl -L https://github.com/xforce/anno1800-mod-loader/releases/download/v0.8.2/xmltest.zip > ./dl/xmltest.zip
unzip -o ./dl/xmltest.zip

# FileDBReader.exe, informal permission to bundle with the extension
curl -L https://github.com/anno-mods/FileDBReader/releases/download/v2.1.1/FileDBReader.zip > ./dl/FileDBReader.zip
unzip -o ./dl/FileDBReader.zip 

# rdm4-bin.exe, 0.6.0-alpha-1+3 (fetched from test action... I hope there will be an official build soon)
curl -L https://github.com/jakobharder/rdm4/releases/download/jakob%2F0.6.0-alpha.1%2B3/rdm4-bin-windows-amd64.zip > ./dl/rdm4.zip
unzip -o ./dl/rdm4.zip

# annotex / bc7enc, MIT
curl -L https://github.com/jakobharder/annotex/releases/download/jakob%2Fv1.2.0/annotex.exe > ./annotex.exe

rm -r ./dl
