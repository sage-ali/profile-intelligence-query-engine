import { Injectable } from '@nestjs/common';
import { ParsedProfileQuery } from '../types/profile-query.types';

import nlp from 'compromise';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

@Injectable()
export class NlqService {
  private readonly countryAliases: Record<string, string> = {
    usa: 'US',
    us: 'US',
    'u s': 'US',
    'u s a': 'US',
    america: 'US',
    american: 'US',
    'united states': 'US',
    uk: 'GB',
    'u k': 'GB',
    britain: 'GB',
    british: 'GB',
    england: 'GB',
    english: 'GB',
    scotland: 'GB',
    scottish: 'GB',
    wales: 'GB',
    welsh: 'GB',
    nigeria: 'NG',
    nigerian: 'NG',
    ghana: 'GH',
    ghanaian: 'GH',
    kenya: 'KE',
    kenyan: 'KE',
    canada: 'CA',
    canadian: 'CA',
    india: 'IN',
    indian: 'IN',
    brazil: 'BR',
    brazilian: 'BR',
    germany: 'DE',
    german: 'DE',
    france: 'FR',
    french: 'FR',
    italy: 'IT',
    italian: 'IT',
    spain: 'ES',
    spanish: 'ES',
    australia: 'AU',
    australian: 'AU',
    china: 'CN',
    chinese: 'CN',
    japan: 'JP',
    japanese: 'JP',
    mexico: 'MX',
    mexican: 'MX',
    'south africa': 'ZA',
    'south african': 'ZA',
  };

  private readonly countryNamesToAlpha2: Record<string, string>;

  constructor() {
    this.countryNamesToAlpha2 = this.buildCountryNamesMap();
  }

  parse(rawInput: string): ParsedProfileQuery {
    const text = this.normalize(rawInput);
    const result: ParsedProfileQuery = {};

    if (!text) {
      return result;
    }

    this.extractGender(text, result);
    this.extractAgeGroup(text, result);
    this.extractAgeRanges(text, result);
    this.extractCountry(text, result);
    this.extractSort(text, result);

    return result;
  }

  private normalize(input: string): string {
    // Expand contractions and clean text without destructive NLP normalization
    const doc = nlp(input.toLowerCase());
    doc.contractions().expand();

    return doc
      .text()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }

  private extractGender(text: string, result: ParsedProfileQuery): void {
    const hasMale = /\b(male|males|man|men)\b/.test(text);
    const hasFemale = /\b(female|females|woman|women)\b/.test(text);

    if (hasMale && hasFemale) return;

    if (hasMale) {
      result.gender = 'male';
    } else if (hasFemale) {
      result.gender = 'female';
    }
  }

  private extractAgeGroup(text: string, result: ParsedProfileQuery): void {
    if (/\b(child|children)\b/.test(text)) {
      result.age_group = 'child';
    } else if (/\b(teen|teens|teenager|teenagers)\b/.test(text)) {
      result.age_group = 'teenager';
    } else if (/\b(adult|adults)\b/.test(text)) {
      result.age_group = 'adult';
    } else if (/\b(senior|seniors|elderly)\b/.test(text)) {
      result.age_group = 'senior';
    }
  }

  private extractAgeRanges(text: string, result: ParsedProfileQuery): void {
    if (/\byoung\b/.test(text)) {
      result.min_age = 16;
      result.max_age = 24;
    }

    const overMatch = text.match(/\b(?:above|over|older than)\s+(\d{1,3})\b/);
    if (overMatch?.[1]) {
      result.min_age = Number(overMatch[1]);
    }

    const underMatch = text.match(
      /\b(?:under|below|younger than)\s+(\d{1,3})\b/,
    );
    if (underMatch?.[1]) {
      result.max_age = Number(underMatch[1]);
    }
  }

  private extractCountry(text: string, result: ParsedProfileQuery): void {
    // Combine all potential country matches
    const allCandidates = {
      ...this.countryNamesToAlpha2,
      ...this.countryAliases,
    };

    // Sort keys by length descending to match "United States" before "United"
    const sortedKeys = Object.keys(allCandidates).sort(
      (a, b) => b.length - a.length,
    );

    for (const term of sortedKeys) {
      const pattern = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
      if (pattern.test(text)) {
        result.country_id = allCandidates[term];
        return;
      }
    }
  }

  private extractSort(text: string, result: ParsedProfileQuery): void {
    if (/\b(sort|sorted|order)\b/.test(text)) {
      if (/\bage\b/.test(text)) {
        result.sort_by = 'age';
      } else if (/\bgender probability\b/.test(text)) {
        result.sort_by = 'gender_probability';
      } else if (/\b(created|newest|oldest|date)\b/.test(text)) {
        result.sort_by = 'created_at';
      }
    }

    if (/\b(desc|descending|newest|latest|highest|top)\b/.test(text)) {
      result.order = 'desc';
    } else if (/\b(asc|ascending|oldest|lowest|bottom)\b/.test(text)) {
      result.order = 'asc';
    }
  }

  private buildCountryNamesMap(): Record<string, string> {
    const map: Record<string, string> = {};
    const codes = Object.keys(countries.getAlpha2Codes());

    for (const code of codes) {
      const name = countries.getName(code, 'en');
      if (name) {
        map[this.normalizeCountryKey(name)] = code;
      }

      const aliases = countries.getName(code, 'en', { select: 'all' });
      if (Array.isArray(aliases)) {
        for (const alias of aliases) {
          map[this.normalizeCountryKey(alias)] = code;
        }
      }
    }
    return map;
  }

  private normalizeCountryKey(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
