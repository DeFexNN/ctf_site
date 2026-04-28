--- 
title: UMDCTF - oracle Writeup
date: 2026-04-26
ctf_event: "UMDCTF 2026"
challenge_name: oracle
category: Reverse
tags: [reverse-engineering, binary-analysis, cryptography]
draft: false
author: "andlua"
---

## Challenge Description
The challenge provides an ELF64 PIE binary named `oracle`, which is a "v1 market settlement verifier", and a encoded "feed" file named `feed.bin`. The goal is to create a valid `ticket.txt` file in a specific format that will be accepted by the `oracle` binary and output the flag.

## Initial Analysis
The binary has several interesting sections, including a `.text` section with the main code, a `chk` section with anti-debugging code, a `.xtext` section with encrypted data, and a `.rodata` section with constants and a dispatch table for a virtual machine (VM).

## Step 1 — Analyzing the Binary Structure
The binary can be analyzed using tools like `file`, `readelf`, and `objdump`. The `.text` section contains the main code, while the `chk` section contains anti-debugging code that checks if a debugger is attached. The `.xtext` section is encrypted and contains the main logic for verifying the ticket.

## Step 2 — Bypassing Anti-Debugging
The anti-debugging code can be bypassed by patching the binary to remove the `xorl $0xdeadbeef, 0x20(%rsp)` instruction, which is responsible for corrupting the decryption key when a debugger is attached.

## Step 3 — Decrypting the `.xtext` Section
The `.xtext` section can be decrypted using a TEA-CFB algorithm with a 16-byte key and a 4-byte IV. The key and IV can be extracted from the `main` function.

## Step 4 — Analyzing the `feed.bin` File
The `feed.bin` file has a format that starts with the magic bytes `ARC\x01`, followed by three records: `a`, `b`, and `g`. Record `b` is encrypted with a PRNG stream.

## Step 5 — Understanding the Stack-Based VM
The binary contains a stack-based VM with a dispatch table in the `.rodata` section. The VM has several opcodes, including `PUSH_INPUT`, `PUSH_STATE`, `PUSH_INT`, `LOAD_LOC`, `STORE_LOC`, `READ_U32`, `RETURN`, `CONCAT`, `SHA256`, `BRANCH_IF`, `ADD`, `LT`, `GT`, `EQ`, `NEQ`, `XOR`, `AND`, `OR`, `ROL`, `SHL`, and `SHR`.

## Step 6 — Analyzing the Bytecode
The bytecode in record `b` of the `feed.bin` file can be analyzed to understand its structure and behavior. The bytecode initializes several locations with input values, performs a series of mix operations, checks the results, and outputs a SHA256 hash if the checks pass.

## Flag — `UMDCTF{oh_no_my_prediction_market_feed_has_been_compromised_what_ever_will_i_do}`

## 4. Витягання `state[0]` і `state[1]` через gdb

```gdb
# extract_state.gdb
file /tmp/oracle.patched
starti
break *(0x555555555000+0x55a1-0x1000)
continue
set $entries=*(unsigned long*)$rbp
set $t1=*(unsigned long*)($entries+80+0x30)
set $s0=*(unsigned long*)$t1
set $s1=*(unsigned long*)($t1+8)
dump binary memory /tmp/state0.bin $s0 ($s0+64)
dump binary memory /tmp/state1.bin $s1 ($s1+32)
```

```
state[0] (64 B):
  0a b7 93 00 e8 6f 1d c3 3a da 1c 76 03 a1 89 2d
  0b 9e 4e 93 0d 47 41 70 fd b1 3b 37 a3 4c a4 9b
  30 cb 7a 02 c1 1a 7e 6c 37 f5 74 40 40 3b 43 70
  a2 d5 29 f0 98 8d f2 a7 84 01 b1 c1 2d 3f a6 e5

state[1] (32 B = "expected loc[0..7]"):
  ee 93 61 f9 30 b3 47 89 97 99 f7 c5 bb f4 0f 58
  33 30 70 a3 37 a7 c2 0c 6c d3 83 e9 82 1d e7 d5
```

## 5. Парсер bytecode (`parser2.py`)

```python
import struct, json

with open('/tmp/b1.bin','rb') as f:
    bc = f.read()

OP_NAMES = {
    0x52: 'ADD', 0x5e: 'LT', 0x71: 'GT',
    0xb1: 'XOR', 0xc6: 'AND', 0xd7: 'OR',
    0x3c: 'EQ',  0x89: 'NEQ',
}

i, ops = 0, []
while i < len(bc):
    op = bc[i]
    # LOAD_LOC X (5a XX)…
    if op == 0x5a:
        x = bc[i+1] & 0xf
        j = i + 2
        # ROL: 5a X 37 NNNN 34 66 X
        if bc[j] == 0x37:
            n = struct.unpack_from('<I', bc, j+1)[0]
            j += 5
            if bc[j] == 0x34 and bc[j+1] == 0x66 and (bc[j+2] & 0xf) == x:
                ops.append(('ROL', x, n)); i = j + 3; continue
            if bc[j] == 0x24 and bc[j+1] == 0x66 and (bc[j+2] & 0xf) == x:
                ops.append(('IMUL', x, n)); i = j + 3; continue
        # *_STATE: 5a X 9f sidx 37 off 7e ARITH 66 X    або     ... NEQ DC tgt
        if bc[j] == 0x9f:
            sidx = struct.unpack_from('<H', bc, j+1)[0]; j += 3
            if bc[j] == 0x37:
                offset = struct.unpack_from('<I', bc, j+1)[0]; j += 5
                if bc[j] == 0x7e:
                    j += 1
                    arith = bc[j]
                    if arith in OP_NAMES:
                        opname = OP_NAMES[arith]; j += 1
                        if bc[j] == 0x66 and (bc[j+1] & 0xf) == x:
                            ops.append((f'{opname}_STATE', x, sidx, offset)); i = j + 2; continue
                        if bc[j] == 0xdc:
                            target = struct.unpack_from('<H', bc, j+1)[0]; j += 3
                            ops.append((f'{opname}_STATE_THEN_BRANCH', x, sidx, offset, target)); i = j; continue
        # *_LOC: 5a X 5a Y ARITH 66 X
        if bc[j] == 0x5a:
            y = bc[j+1] & 0xf; j += 2
            arith = bc[j]
            if arith in OP_NAMES:
                opname = OP_NAMES[arith]; j += 1
                if bc[j] == 0x66 and (bc[j+1] & 0xf) == x:
                    ops.append((f'{opname}_LOC', x, y)); i = j + 2; continue

    # INIT_FROM_INPUT: a2 00 37 off 7e 66 X
    if op == 0xa2 and bc[i+1] == 0:
        j = i + 2
        if bc[j] == 0x37:
            offset = struct.unpack_from('<I', bc, j+1)[0]; j += 5
            if bc[j] == 0x7e and bc[j+1] == 0x66:
                ops.append(('INIT_FROM_INPUT', bc[j+2] & 0xf, offset)); i = j + 3; continue
        # FINAL_HASH: a2 00 9f 02 00 93 58 02 01 1d
        if bc[i+2] == 0x9f and bc[i+5] == 0x93 and bc[i+6] == 0x58:
            ops.append(('FINAL_HASH',)); i += 10; continue
    # FAIL_RETURN: 37 00 00 00 00 1d
    if op == 0x37 and bc[i+5] == 0x1d:
        ops.append(('FAIL_RETURN',)); i += 6; continue
    raise SystemExit(f"unrecognized at {i:#x}: {bc[i:i+8].hex()}")

with open('/tmp/ops2.json','w') as f: json.dump(ops, f)

## 6. Інверсія VM і витягнення payload-у (`solve2.py`)

```python
import json, struct, hashlib, base64

ops    = json.load(open('/tmp/ops2.json'))
state0 = list(struct.unpack('<16I', open('/tmp/state0.bin','rb').read()))
target = list(struct.unpack('<8I',  open('/tmp/state1.bin','rb').read()))

K     = 0x5abc7f01
MASK  = 0xffffffff
Kinv  = pow(K, -1, 1 << 32)

def rol(x, n): n &= 31; return ((x << n) | (x >> (32-n))) & MASK if n else x
def ror(x, n): n &= 31; return ((x >> n) | (x << (32-n))) & MASK if n else x

def forward(input_words):
    loc = [0]*16
    for op in ops:
        k = op[0]
        if   k == 'INIT_FROM_INPUT': loc[op[1]] = input_words[op[2]//4]
        elif k == 'XOR_STATE':       loc[op[1]] = (loc[op[1]] ^ state0[op[3]//4]) & MASK
        elif k == 'ADD_STATE':       loc[op[1]] = (loc[op[1]] + state0[op[3]//4]) & MASK
        elif k == 'XOR_LOC':         loc[op[1]] = (loc[op[1]] ^ loc[op[2]]) & MASK
        elif k == 'ADD_LOC':         loc[op[1]] = (loc[op[1]] + loc[op[2]]) & MASK
        elif k == 'ROL':             loc[op[1]] = rol(loc[op[1]], op[2])
        elif k == 'IMUL':            loc[op[1]] = (loc[op[1]] * op[2]) & MASK
        elif k in ('NEQ_STATE_THEN_BRANCH','FINAL_HASH','FAIL_RETURN'): break
    return loc[:8]

def reverse(target_words):
    loc = list(target_words) + [0]*8
    mix = [op for op in ops if op[0] in ('XOR_STATE','ADD_STATE','XOR_LOC','ADD_LOC','ROL','IMUL')]
    for op in reversed(mix):
        k = op[0]
        if   k == 'XOR_STATE': loc[op[1]] = (loc[op[1]] ^ state0[op[3]//4]) & MASK
        elif k == 'ADD_STATE': loc[op[1]] = (loc[op[1]] - state0[op[3]//4]) & MASK
        elif k == 'XOR_LOC':   loc[op[1]] = (loc[op[1]] ^ loc[op[2]]) & MASK
        elif k == 'ADD_LOC':   loc[op[1]] = (loc[op[1]] - loc[op[2]]) & MASK
        elif k == 'ROL':       loc[op[1]] = ror(loc[op[1]], op[2])
        elif k == 'IMUL':      loc[op[1]] = (loc[op[1]] * Kinv) & MASK
    return loc[:8]

input_words = reverse(target)
input_bytes = struct.pack('<8I', *input_words)
assert forward(input_words) == target, "self-check failed"

ticket = b'TKT\x01' + (32).to_bytes(4,'little') + input_bytes
b64    = base64.b64encode(ticket).decode()
content = f'-----BEGIN MARKET TICKET-----\n{b64}\n-----END MARKET TICKET-----\n'
open('/tmp/ticket.txt','w').write(content)

print("input :", input_bytes.hex())
print("sha256:", hashlib.sha256(input_bytes + b'umdctf-v2026-unseal-salt').hexdigest())
print(content)

## 7. Запуск

```bash
cd /tmp
./oracle.fixed
```

```
oracle v1 - market settlement verifier
resolution: UMDCTF{oh_no_my_prediction_market_feed_has_been_compromised_what_ever_will_i_do}
```

## 8. Уроки / "грабли"

1. **0x52 — це ADD, а не XOR.** Це найдорожча помилка під час реверсу: XOR-варіанти й арифметичні діляться на одному handler-і `0x30cb`, а конкретна операція обирається байтом опкоду всередині. Якщо бездумно вважати все XOR-ом, реверс mix-у дасть неправильний вхід, але self-check на Python пройде (бо в інверсії та емуляції буде той самий неправильний оператор) — і помилка виявиться лише при реальному запуску.
2. **Patch ≠ обхід**: можна заNOPити anti-debug, але не можна "пропустити" verifier — його вихід (32 байти `sha256(input || salt)`) є **AES-ключем+IV** для розшифрування поля `g`, всередині якого і ховається ресолюшен/флаг. Без правильного `input` ключ неправильний → флага не буде.
3. **READ_U32 пропихає zero-extended u64 в стек**, але `STORE_LOC` зберігає лише нижні 32 біти — тому ADD може "перелитись" у 33-й біт і коректно обрізатись.

## Файли

- `parser2.py` — парсер bytecode → JSON.
- `solve2.py` — інверсія + генерація `ticket.txt`.
- `ticket.txt` — готовий квиток.
- `oracle.fixed` — пропатчений оракул (8 NOP-ів на `0x1264`).
- `state0.bin`, `state1.bin` — дамп таблиць VM (через gdb).
- `b1.bin` — bytecode із розшифрованого поля `b` `feed.bin`.

Результат:

```
input : 290f946432f641d3d9e1365590f0540aec3352de8cecb57c67ed481121355ad6
sha256: a75b0572c5d7e262584ef70b77b31dc414eb2daeb1dbe9db2b8745df049b2b12

-----BEGIN MARKET TICKET-----
VEtUASAAAAApD5RkMvZB09nhNlWQ8FQK7DNS3ozstXxn7UgRITVa1g==
-----END MARKET TICKET-----
```