import { useState } from 'react';
import type { AnalyzedGroupReport } from '../application/reports/analyzeGroupReportPdf';
import { groupMatchKey } from '../domain/reports/groupMatch';
import { buildPriceSuggestions, type PriceSuggestion } from '../domain/pricing/priceSuggestions';
import type { PricingRule, SupportedCurrency } from '../domain/pricing/pricingRules';
import type { IsoDate } from '../domain/shared/types';
import { ROOM_TYPES } from '../domain/rooms/roomTypes';

interface PricingRulesPanelProps {
  analyses: AnalyzedGroupReport[];
  selectedGroupName: string | null;
  rules: PricingRule[];
  onRulesChange: (rules: PricingRule[]) => void;
}

interface PricingRuleForm {
  reportDate: string;
  roomType: string;
  adults: string;
  children: string;
  rate: string;
  currency: SupportedCurrency;
}

const INITIAL_FORM: PricingRuleForm = {
  reportDate: '',
  roomType: '',
  adults: '',
  children: '',
  rate: '',
  currency: 'ILS',
};

export default function PricingRulesPanel({ analyses, selectedGroupName, rules, onRulesChange }: PricingRulesPanelProps) {
  const [form, setForm] = useState<PricingRuleForm>(INITIAL_FORM);
  const [suggestionCurrency, setSuggestionCurrency] = useState<SupportedCurrency>('ILS');
  const [formError, setFormError] = useState<string | null>(null);
  const selectedAnalyses = selectedGroupName
    ? analyses.map((report) => ({
      ...report,
      groups: report.groups.filter((group) => groupMatchKey(group.groupName) === groupMatchKey(selectedGroupName)),
    })).filter((report) => report.groups.length > 0)
    : [];
  const observations = selectedAnalyses.flatMap((report) => report.groups.flatMap((group) => group.rooms.map((room) => ({
    reportDate: report.reportDate as IsoDate,
    bookedRoomType: room.bookedRoomType,
    actualRoomType: room.actualRoomType,
    adults: room.adults,
    children: room.children,
    reportedRate: room.reportedRate,
  }))));
  const suggestions = buildPriceSuggestions(observations).filter((suggestion) => !rules.some((rule) => (
    rule.reportDate === suggestion.reportDate
    && rule.roomType === suggestion.roomType
    && rule.adults === suggestion.adults
    && rule.children === suggestion.children
    && rule.rate === suggestion.rate
  )));

  function updateForm(field: keyof PricingRuleForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
  }

  function addRule() {
    const adults = Number(form.adults);
    const children = Number(form.children);
    if (!form.reportDate || !form.roomType.trim() || !Number.isInteger(adults) || !Number.isInteger(children)
      || adults < 0 || children < 0 || !/^\d+(\.\d+)?$/u.test(form.rate.trim())) {
      setFormError('Complete the date, room type, occupancy, and numeric rate.');
      return;
    }

    onRulesChange([...rules, {
      id: `pricing-rule-${Date.now()}`,
      reportDate: form.reportDate as IsoDate,
      roomType: form.roomType.trim(),
      adults,
      children,
      rate: form.rate.trim(),
      currency: form.currency,
    }]);
    setForm({ ...INITIAL_FORM, currency: form.currency });
    setFormError(null);
  }

  function addSuggestion(suggestion: PriceSuggestion) {
    onRulesChange([...rules, {
      id: `pricing-rule-${Date.now()}-${suggestion.roomType}`,
      reportDate: suggestion.reportDate,
      roomType: suggestion.roomType,
      adults: suggestion.adults,
      children: suggestion.children,
      rate: suggestion.rate,
      currency: suggestionCurrency,
    }]);
  }

  return (
    <section className="pricing-panel" aria-labelledby="pricing-rules-title">
      <div className="pricing-panel-heading">
        <div>
          <p className="eyebrow">Manual contract input</p>
          <h3 id="pricing-rules-title">Pricing Rules</h3>
        </div>
      </div>
      <p className="muted">One rule matches the report date, room type, adults, children, rate, and currency.</p>
      <div className="pricing-entry-card">
        <div className="pricing-entry-heading">
          <strong>Add pricing rule</strong>
          <span>All fields are required</span>
        </div>
        <div className="pricing-form">
          <label>
            <span>Report date</span>
            <input type="date" value={form.reportDate} onChange={(event) => updateForm('reportDate', event.target.value)} />
          </label>
          <label>
            <span>Room Type</span>
            <select value={form.roomType} onChange={(event) => updateForm('roomType', event.target.value)}>
              <option value="">Select room type</option>
              {ROOM_TYPES.map((roomType) => (
                <option key={roomType.code} value={roomType.code}>
                  {roomType.code} · {roomType.en}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Adults</span>
            <input type="number" min="0" value={form.adults} onChange={(event) => updateForm('adults', event.target.value)} />
          </label>
          <label>
            <span>Children</span>
            <input type="number" min="0" value={form.children} onChange={(event) => updateForm('children', event.target.value)} />
          </label>
          <label>
            <span>Rate</span>
            <input inputMode="decimal" value={form.rate} placeholder="125.00" onChange={(event) => updateForm('rate', event.target.value)} />
          </label>
          <label>
            <span>Currency</span>
            <select value={form.currency} onChange={(event) => updateForm('currency', event.target.value as SupportedCurrency)}>
              <option value="ILS">ILS</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <button className="primary-button pricing-add-button" type="button" onClick={addRule}>Add pricing rule</button>
      </div>
      {formError && <p className="error-message" role="alert">{formError}</p>}
      {rules.length > 0 && (
        <div className="pricing-rule-list">
          <strong>Active rules</strong>
          {rules.map((rule) => (
            <div className="pricing-rule-row" key={rule.id}>
              <span>{rule.reportDate} · {rule.roomType} · A{rule.adults}/C{rule.children} · {rule.rate} {rule.currency}</span>
              <button className="text-button" type="button" onClick={() => onRulesChange(rules.filter((item) => item.id !== rule.id))}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <div className="pricing-suggestions">
        <div className="pricing-suggestions-heading">
          <strong>Suggested prices from the selected group</strong>
          <label>
            Currency
            <select value={suggestionCurrency} onChange={(event) => setSuggestionCurrency(event.target.value as SupportedCurrency)}>
              <option value="ILS">ILS</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        {!selectedGroupName && <p className="muted">Select a group to see suggestions from that group only.</p>}
        {selectedGroupName && suggestions.length === 0 && <p className="muted">No complete numeric rate observations were found for this group.</p>}
        {suggestions.map((suggestion) => (
          <div className="pricing-suggestion-row" key={`${suggestion.reportDate}-${suggestion.roomType}-${suggestion.adults}-${suggestion.children}-${suggestion.rate}`}>
            <span><strong>{suggestion.reportDate} · {suggestion.roomType}</strong> · A{suggestion.adults}/C{suggestion.children} · {suggestion.rate} · seen {suggestion.occurrenceCount} time(s)</span>
            <button className="secondary-button" type="button" onClick={() => addSuggestion(suggestion)}>Add as rule</button>
          </div>
        ))}
      </div>
    </section>
  );
}
