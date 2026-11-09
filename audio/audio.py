#!/usr/bin/env python3
"""Music + SFX stems for "The Candy Bar That Started Microwaves".
usage: python3 audio.py <voice> <outdir>   -> outdir/music.wav, outdir/sfx.wav (48 kHz stereo, exact voice length)
"""
import sys, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, fife, glock, musicbox, timpani, cymbal, brush, triangle
from sfx_gen import rattle, clink, whoosh, bird_chirps, crickets, breeze, splash_big

FPS = 30.0
F = lambda f: f / FPS


def voice_len(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True
    ).stdout
    return len(raw) // 4


# Custom synths for 1940s Radar Lab & Experiments
def popcorn_pop(r, pitch=1.0):
    d = 0.14
    t = tt(d)
    nz = r.standard_normal(len(t))
    snap = bp(nz, 1800 * pitch, 8500 * pitch, 2) * np.exp(-t / 0.005) * 1.8
    body = modal(d, [(480 * pitch, 1.0, 0.025), (820 * pitch, 0.5, 0.015)], r)
    return fades(snap + body * 0.7, 0.0, 0.03)


def egg_splat(r):
    d = 0.8
    t = tt(d)
    nz = r.standard_normal(len(t))
    # Sharp shell crack
    crack = bp(nz, 2200, 9500, 1) * np.exp(-t / 0.006) * 2.2
    # Wet yolk splat
    wet = lp(nz, 1200, 2) * np.exp(-t / 0.04) * 1.6
    wet += bp(nz, 400, 2400, 1) * np.exp(-t / 0.08) * 1.1
    # Low pop thump
    thump = np.sin(phase(85 * (1 + 0.4 * np.exp(-t / 0.015)))) * np.exp(-t / 0.06) * 1.5
    return fades(crack + wet + thump, 0.0, 0.1)


def squish_soft(r):
    d = 0.35
    t = tt(d)
    nz = r.standard_normal(len(t))
    return fades(bp(nz, 600, 3200, 1) * np.exp(-t / 0.035) * 0.8, 0.002, 0.05)


def radar_hum(dur, r, a=0.6):
    n = ns(dur)
    t = np.arange(n) / SR
    # 60 Hz line buzz + 120 Hz + 180 Hz harmonics with slight frequency jitter
    hum = (
        np.sin(phase(60 * (1 + 0.005 * np.sin(t * 3)))) * 0.8 +
        np.sin(phase(120 * np.ones(n))) * 0.4 +
        np.sin(phase(180 * np.ones(n))) * 0.2 +
        np.sin(phase(1200 + 40 * np.sin(t * 8))) * 0.08
    )
    # High-frequency vacuum tube hiss
    hiss = bp(r.standard_normal(n), 2500, 7000, 1) * 0.06
    return fades((hum + hiss) * a, 0.08, 0.08)


def heavy_door_clank(r):
    d = 1.0
    t = tt(d)
    thump = np.sin(phase(55 * (1 + 0.3 * np.exp(-t / 0.02)))) * np.exp(-t / 0.08) * 1.8
    clank = modal(d, [(620, 0.8, 0.06), (1140, 0.5, 0.04), (2100, 0.3, 0.02)], r)
    return fades(thump + clank, 0.0, 0.12)


def steam_hiss(dur, r, a=0.5):
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 3000, 9000, 1) * np.sin(np.pi * (t / dur)) * a
    return fades(y, 0.05, 0.05)


# ================================================================ MUSIC
def music(N):
    r = rng(17)
    out = np.zeros((2, N))
    tempo = 116.0
    beat = 60.0 / tempo
    bar = 4 * beat

    # C major / G major walking groove
    root = m2f(36)  # C2

    def groove(t0, t1, amp=1.0):
        t = t0
        while t < t1 - 0.05:
            # Walking bass line
            for i, note in enumerate([36, 40, 43, 45, 48, 47, 45, 43]):
                bt = t + i * (beat / 2)
                if bt >= t1 - 0.05:
                    break
                p = pluck(m2f(note), 0.35, r, bright=0.5)
                place(out, pan(p, -0.15), bt, amp * 0.8)
                # Soft brush on offbeats
                if i % 2 == 1:
                    br = brush(0.12, r, 0.35)
                    place(out, pan(br, 0.15), bt, amp * 0.45)
            t += bar

    # Intro & Lab Groove (f0 to f625 = 0s to 20.8s)
    groove(0.1, F(625), 0.75)

    # Playful pizzicato / glock melody during testing
    melody_notes = [
        (F(30), 72, 0.3), (F(45), 76, 0.3), (F(60), 79, 0.4), (F(85), 76, 0.3),
        (F(150), 72, 0.25), (F(170), 74, 0.25), (F(190), 76, 0.3), (F(220), 79, 0.35),
        (F(310), 84, 0.3), (F(330), 81, 0.3), (F(350), 79, 0.35),
        (F(410), 76, 0.25), (F(430), 79, 0.25), (F(450), 81, 0.3), (F(475), 84, 0.35),
    ]
    for tm, pitch, dur in melody_notes:
        if tm < F(625):
            place(out, pan(glock(m2f(pitch), dur, r, 1.4), 0.2), tm, 0.5)

    # Discovery beat (f625 to f767): music suspends into dreamy sci-fi shimmer
    disc_start = F(625)
    disc_len = F(767) - disc_start
    # Warm ethereal pad chord: C major 9 (C, E, G, B, D)
    chord = [m2f(48), m2f(52), m2f(55), m2f(59), m2f(62)]
    place(out, pad(chord, disc_len, 0.38, r, att=0.6, rel=0.8, warm=1600), disc_start, 0.9)
    # Bell arpeggios
    for i, m in enumerate([72, 76, 79, 83, 86, 88]):
        place(out, pan(musicbox(m2f(m), 0.4, r, 1.5), -0.25 + 0.1 * i), disc_start + 0.3 + i * 0.45, 0.6)

    # Time-jump to Prototype (f767): Timpani swell & industrial grandeur!
    proto_start = F(767)
    place(out, pan(timpani(m2f(36), 0.9, r, 2.0), 0.0), proto_start, 1.1)
    place(out, cymbal(0.5, r, 2.2), proto_start, 0.45)

    # Confident groove returns for prototype reveal
    groove(proto_start + 0.2, F(1018), 0.85)
    # Brass-style chords supporting the 6-foot giant
    for tm in [proto_start + 0.5, proto_start + bar, proto_start + 2 * bar]:
        if tm < F(1018) - 1.0:
            place(out, pad([m2f(48), m2f(55), m2f(60)], 1.8, 0.3, r, att=0.1, rel=0.4, warm=1200), tm, 0.7)

    # Payoff (f1018 to end): The twist sting & resolved finale
    pay_start = F(1018)
    # Music stops on twist line, leaving rich low drone + sting
    place(out, pan(brush(0.4, r, 0.4, swish=True), 0.0), pay_start - 0.1, 0.7)
    # Warm resolved chord
    END = N / SR
    final_len = END - pay_start
    place(out, pad([m2f(36), m2f(43), m2f(48), m2f(52), m2f(55)], final_len, 0.35, r, att=0.4, rel=0.6, warm=900), pay_start, 0.9)
    # Closing chime on last word (~f1125)
    place(out, pan(glock(m2f(84), 0.6, r, 1.8), 0.2), F(1124), 0.7)
    place(out, pan(triangle(0.35, r, 1.6), 0.25), F(1125), 0.45)
    place(out, pan(timpani(m2f(36), 0.6, r, 1.8), 0.0), F(1124), 0.8)

    # Gentle studio room reverb
    ir = make_ir(1.1, 4, hf=1.2)
    wet = convolve_st(out, ir)
    out = out + 0.15 * wet
    return fades(out, 0.01, 0.25)


# ================================================================ SFX
def sfx(N):
    r = rng(31)
    out = np.zeros((2, N))
    END = N / SR

    # Subtle lab ambience (hum + air)
    lab_bg = radar_hum(END, r, a=0.22)
    place(out, lab_bg, 0.0, 0.5)

    # 1. Hook (chocolate softening)
    place(out, pan(squish_soft(r), 0.1), F(40), 0.4)
    place(out, pan(squish_soft(r), 0.1), F(75), 0.45)

    # 2. Lab equipment active
    place(out, pan(whoosh(0.8, r, 0.5, 250, 1600, 0.8, 0.2), 0.0), F(120), 0.25)
    place(out, pan(radar_hum(F(390) - F(150), r, a=0.35), -0.2), F(150), 0.6)

    # 3. Popcorn popping! (f488 - f512)
    for fi, ptch in [(488, 1.0), (491, 1.15), (494, 0.95), (498, 1.25), (503, 1.05), (509, 1.1)]:
        place(out, pan(popcorn_pop(r, ptch), r.uniform(-0.15, 0.15)), F(fi), 0.75)
    place(out, pan(whoosh(0.3, r, 0.2, 500, 3000), 0.1), F(488), 0.3)

    # 4. Egg burst! (f579)
    # Shudder before explosion
    place(out, pan(smooth_noise(ns(0.4), r, 40) * 0.3, 0.0), F(565), 0.4)
    # Explosion
    place(out, pan(egg_splat(r), 0.0), F(579), 0.85)
    place(out, pan(whoosh(0.4, r, 0.3, 400, 3500), 0.1), F(579), 0.4)

    # 5. Realization energy ripple
    for fi in [635, 675, 715]:
        place(out, pan(clink(r, 0.4, 3200), 0.15), F(fi), 0.3)

    # 6. Prototype reveal
    place(out, pan(whoosh(1.1, r, 0.6, 200, 1800, 0.9, 0.3), 0.0), F(767), 0.35)
    place(out, pan(heavy_door_clank(r), 0.15), F(778), 0.65)
    place(out, pan(steam_hiss(1.2, r, 0.4), 0.2), F(880), 0.4)

    # 7. Payoff
    place(out, pan(whoosh(1.2, r, 0.7, 200, 1400, 0.9, 0.4), 0.0), F(1018), 0.25)
    place(out, pan(clink(r, 0.5, 4200), 0.2), F(1124), 0.5)

    return fades(out, 0.01, 0.25)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N)
    s = sfx(N)
    write_wav(f"{outdir}/music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems written", N / SR, "s")
