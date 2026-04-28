---
title: Osint
date: 2026-04-28
ctf_event: UMDCTF2026
challenge_name: osint
category: OSINT
tags: [osint, telegram, doxxing]
author: lox_chort
---

## Challenge Description

The challenge requires finding personal records of the admin of a Telegram group that doxxed people. We are provided with 9 Telegram bots and a `.json` file to aid in our investigation.

## Initial Analysis

The challenge is about finding personal records of a "criminal". The provided `.json` file and Telegram bots will be used to gather information about the target.

## Step 1 - Analysis of .json file

The `.json` file was sent to Gemini, who provided a nickname `@hermes\_locker` and a sticker pack that was used only once.

## Step 2 - Investigate data from .json

The task description mentioned that the target does not have an account, so we looked at the sticker pack. Using the sticker bot, we obtained the Creator UID: `7816442093`.

## Step 3 - Find something about Creator of sticker pack

With the UID `7816442093`, we used the 3 bots that can find information about a user. The bots provided a bunch of nicknames, and we started brute forcing them using the Sherlock-like bot. When we sent `@zeuse\_archive`, the bot returned `@thanatos\_signal`.

## Step 4 - Almost finished, or are we?

The nickname `@thanatos\_signal` gave us new leads. We put it into the bots, which gave us 3 more nicknames. What, fuck it gave me 3 more nick, hell nah I’m not doing it again. Then I noticed a phone number: +49 160 5550 7318, before nicknames I tried to find something with phone number. Bingo!!! We found:

📞 PHONE: `+49 160 5550 7318`
👤 NAME: **Niklas Hofmann**
🔗 LINKED UID: `7816442093`
🔹 LINKED USERNAMES: `@kerberos\_spine`
We finally found the name.

## Step 5 - Finalization

We remembered the 4 bots from the beginning, and one of them can give us a personal record if we provide a name. Assuming Niklas Hofmann is German, we used the bot to find:
🌍 Country: **Germany**
🔍 Query: **Niklas Hofmann**
📄 Record: **REC-9305174**

## Flag

`UMDCTF{REC-9305174}`

