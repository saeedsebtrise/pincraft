/**
 * Trending Pinterest Pin Templates
 * High-converting, viral-tested pin layouts designed for high-traffic niches:
 * Fashion & Capsule Wardrobes, Quick Recipes, Habits & Wellness, Travel Bucket Lists,
 * Modern Home Decor, and Aesthetic Quotes.
 */
import { createShape, createText } from '../model/factory';
import type { Template } from '../model/types';
import { accent, badge, bandShape, divider, footer, label, title, tpl } from './kit';

export const TRENDING_TEMPLATES: Template[] = [
  // 1. Fashion & Capsule Wardrobe
  tpl({
    id: 'tr-fashion-capsule-arch',
    name: 'Capsule Wardrobe — Minimalist Editorial',
    description: 'Clean single photo with chic script accent, high-contrast Playfair serif title, and pill website badge.',
    family: 1,
    categories: ['Fashion', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-panel'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      createShape({ name: 'Text card', role: 'decor', x: W * 0.07, y: H * 0.58, width: W * 0.86, height: H * 0.37, fill: '#FFFFFF', cornerRadius: 20 }),
      label(W * 0.12, H * 0.61, W * 0.76, 32, 'FASHION & STYLE EDIT', { fontFamily: 'Montserrat', letterSpacing: 4, fill: '#64748B', fontSize: 18 }),
      accent(W * 0.12, H * 0.655, W * 0.76, 68, 'Chic', { fill: '#BE123C', fontFamily: 'Playfair Display', italic: true, fontWeight: 700, fontSize: 62 }),
      title(W * 0.12, H * 0.725, W * 0.76, 120, 'Capsule Wardrobe Essentials', { fontFamily: 'DM Serif Display', fontWeight: 400, textTransform: 'none', fill: '#0F172A', fontSize: 68, lineHeight: 1.15 }),
      footer(W, H, 'plain-dark', { y: H * 0.88, fill: '#64748B', fontSize: 22 }),
    ],
  }),

  // 2. Food & 15-Minute Recipe
  tpl({
    id: 'tr-recipe-dinner-steps',
    name: 'Quick 15-Min Dinner — Recipe & Steps',
    description: 'Top hero food photography with 2 preparation steps below, prep-time pill badge, bold title and Get Recipe button.',
    family: 4,
    categories: ['Food / Recipe', 'How-To'],
    designTypes: ['collage-4', 'editorial'],
    collage: { layoutId: 'three-hero-top', gap: 10 },
    layers: ({ W, H }) => [
      createShape({ name: 'Header banner', role: 'decor', x: W * 0.05, y: H * 0.035, width: W * 0.9, height: H * 0.22, fill: '#FFFFFF', cornerRadius: 18 }),
      badge(W * 0.08, H * 0.06, 50, '15 MIN', 'pill', '#E60023', '#FFFFFF', { fontSize: 20, fontWeight: 800 }),
      accent(W * 0.38, H * 0.055, W * 0.52, 60, 'Easy', { fill: '#E60023', fontFamily: 'Playfair Display', italic: true, fontSize: 48, fontWeight: 700 }),
      title(W * 0.08, H * 0.115, W * 0.84, 85, 'Garlic Butter Pasta', { fontFamily: 'Oswald', fontWeight: 700, fill: '#0F172A', fontSize: 58, lineHeight: 1.05 }),
      createShape({ name: 'CTA background', role: 'decor', x: W * 0.24, y: H * 0.91, width: W * 0.52, height: 50, fill: '#E60023', cornerRadius: 25 }),
      createText({
        name: 'CTA button',
        role: 'cta',
        x: W * 0.24,
        y: H * 0.91,
        width: W * 0.52,
        height: 50,
        text: 'GET THE RECIPE →',
        fontFamily: 'Montserrat',
        fontWeight: 800,
        fontSize: 18,
        fill: '#FFFFFF',
        align: 'center',
        lineHeight: 1,
      }),
      footer(W, H, 'over-image', { y: H * 0.965, fontSize: 18 }),
    ],
  }),

  // 3. Wellness & Habit Tracker
  tpl({
    id: 'tr-wellness-glow-habits',
    name: 'Daily Glow Up — Wellness Checklist',
    description: 'Top lifestyle photo with bottom pastel card, big circle number badge, aesthetic script accent, and structured title.',
    family: 2,
    categories: ['Beauty', 'Lifestyle', 'Listicle'],
    designTypes: ['listicle', 'number-badge'],
    collage: { layoutId: 'two-hero', gap: 0 },
    layers: ({ W, H }) => [
      createShape({ name: 'Card bg', role: 'decor', x: 0, y: H * 0.58, width: W, height: H * 0.42, fill: '#FFFBFB' }),
      badge(W / 2 - 55, H * 0.53, 110, '7', 'circle', '#BE123C', '#FFFFFF', { fontSize: 68, fontFamily: 'Playfair Display', fontWeight: 900 }),
      accent(W * 0.1, H * 0.63, W * 0.8, 65, 'Aesthetic', { fill: '#BE123C', fontFamily: 'Playfair Display', italic: true, fontSize: 50, fontWeight: 700, align: 'center' }),
      title(W * 0.08, H * 0.68, W * 0.84, 140, 'Daily Morning Habits for Radiant Skin', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 54, fill: '#0F172A', lineHeight: 1.15, textTransform: 'none', align: 'center' }),
      createText({
        name: 'Subtitle',
        role: 'subtitle',
        x: W * 0.1,
        y: H * 0.81,
        width: W * 0.8,
        height: 50,
        text: 'Simple steps that make a big difference',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 24,
        fill: '#64748B',
        align: 'center',
        fontWeight: 600,
      }),
      footer(W, H, 'plain-dark', { y: H * 0.93, fontSize: 22 }),
    ],
  }),

  // 4. Travel Bucket List
  tpl({
    id: 'tr-travel-destinations-band',
    name: 'Travel Bucket List — Center Band Pin',
    description: '2 top photos + deep obsidian navy center band + 2 bottom scenic photos, bold white title, and destination stamp.',
    family: 3,
    categories: ['Lifestyle', 'Custom Blog Pin', 'Listicle'],
    designTypes: ['editorial', 'collage-4'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.28 },
    layers: ({ W, H }) => [
      bandShape('#0F172A', 'Obsidian band'),
      badge(W * 0.08, H * 0.38, 64, '12', 'rounded', '#E60023', '#FFFFFF', { fontSize: 36, fontFamily: 'Montserrat', fontWeight: 800 }),
      accent(W * 0.22, H * 0.38, W * 0.68, 64, 'Dreamy', { fill: '#FDA4AF', fontFamily: 'Playfair Display', italic: true, fontSize: 52, fontWeight: 700 }),
      title(W * 0.08, H * 0.44, W * 0.84, 100, 'Bucket List Places to Visit', { fontFamily: 'Playfair Display', fontWeight: 800, fill: '#FFFFFF', fontSize: 58, lineHeight: 1.1 }),
      createText({
        name: 'Subtitle',
        role: 'subtitle',
        x: W * 0.08,
        y: H * 0.53,
        width: W * 0.84,
        height: 40,
        text: 'THE ULTIMATE 2026 TRAVEL GUIDE',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 20,
        fill: '#94A3B8',
        letterSpacing: 2,
        fontWeight: 700,
      }),
      footer(W, H, 'over-image', { y: H * 0.955, fontSize: 20 }),
    ],
  }),

  // 5. Modern Home Decor
  tpl({
    id: 'tr-home-decor-floating-card',
    name: 'Modern Home Decor — Floating Split Card',
    description: '2 stacked interior photos with a central floating white card, bold DM Serif Display typography, and number badge.',
    family: 5,
    categories: ['Home Decor', 'Living Room', 'Listicle'],
    designTypes: ['editorial', 'script-bold', 'number-badge'],
    collage: { layoutId: 'two-stack', gap: 8 },
    layers: ({ W, H }) => [
      createShape({ name: 'Floating Card', role: 'decor', x: W * 0.07, y: H * 0.36, width: W * 0.86, height: H * 0.28, fill: '#FFFFFF', cornerRadius: 18 }),
      badge(W / 2 - 40, H * 0.33, 80, '25', 'circle', '#0F172A', '#FFFFFF', { fontSize: 44, fontFamily: 'DM Serif Display' }),
      accent(W * 0.1, H * 0.40, W * 0.8, 55, 'Cozy', { fill: '#B45309', fontFamily: 'Playfair Display', italic: true, fontSize: 48, align: 'center', fontWeight: 700 }),
      title(W * 0.1, H * 0.45, W * 0.8, 95, 'Living Room Decor Ideas', { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#0F172A', fontSize: 58, lineHeight: 1.15, textTransform: 'none', align: 'center' }),
      createText({
        name: 'Subtitle',
        role: 'subtitle',
        x: W * 0.1,
        y: H * 0.54,
        width: W * 0.8,
        height: 38,
        text: 'Warm, Minimalist & Budget-Friendly',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 20,
        fill: '#64748B',
        fontWeight: 600,
        align: 'center',
      }),
      footer(W, H, 'plain-dark', { y: H * 0.59, fontSize: 18 }),
    ],
  }),

  // 6. Aesthetic Mindset Quote
  tpl({
    id: 'tr-mindset-glow-quote',
    name: 'Daily Affirmation — Aesthetic Quote',
    description: 'Aesthetic mood photo with warm tinted scrim, large decorative quote marks, and inspiring serif typography.',
    family: 8,
    categories: ['Quote', 'Lifestyle'],
    designTypes: ['quote-advice', 'single-image'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      createShape({ name: 'Dark overlay', role: 'decor', x: W * 0.07, y: H * 0.20, width: W * 0.86, height: H * 0.60, fill: '#0F172A', opacity: 0.82, cornerRadius: 24 }),
      createText({ name: 'Quote mark', role: 'decor', x: W * 0.12, y: H * 0.23, width: W * 0.76, height: 75, text: '“', fontFamily: 'Playfair Display', fontSize: 120, fill: '#FDA4AF', fontWeight: 900, align: 'center' }),
      title(W * 0.12, H * 0.32, W * 0.76, 220, 'Small daily habits create massive lifelong changes.', { fontFamily: 'Playfair Display', fontWeight: 500, fill: '#FFFFFF', fontSize: 48, lineHeight: 1.35, textTransform: 'none', align: 'center' }),
      divider(W * 0.35, H * 0.55, W * 0.3, 'rgba(255,255,255,0.3)', 2),
      label(W * 0.12, H * 0.59, W * 0.76, 30, 'DAILY MOTIVATION & SELF CARE', { fill: '#E2E8F0', fontSize: 16, letterSpacing: 3, align: 'center' }),
      footer(W, H, 'over-image', { y: H * 0.72, fontSize: 20 }),
    ],
  }),
];
