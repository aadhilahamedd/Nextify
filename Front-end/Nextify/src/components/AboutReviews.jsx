import React, { useEffect, useMemo, useState } from 'react';
import { getReviewsAPI, submitReviewAPI } from '../Services/allAPI';

const FEATURED = [
  { name: 'Corporate guest', quote: 'Punctual, discreet, and a flawless airport transfer in Riyadh.', rating: 5 },
  { name: 'Wedding planner, Khobar', quote: 'Our event fleet arrived on time and looked impeccable.', rating: 5 },
];

const emptyForm = { name: '', role: '', quote: '', rating: 5 };

export default function AboutReviews() {
  const [reviews, setReviews] = useState(FEATURED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    (async () => {
      const res = await getReviewsAPI();
      const list = res?.data?.reviews;
      if (res?.status === 200 && Array.isArray(list) && list.length) {
        setReviews([
          ...list.map((item) => ({
            name: item.role || item.name,
            quote: item.quote,
            rating: item.rating || 5,
          })),
          ...FEATURED,
        ].slice(0, 4));
      }
    })();
  }, []);

  const average = useMemo(() => {
    if (!reviews.length) return '5.0';
    const avg = reviews.reduce((sum, item) => sum + (Number(item.rating) || 5), 0) / reviews.length;
    return avg.toFixed(1);
  }, [reviews]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (!form.name.trim() || !form.quote.trim()) {
      setError('Please add your name and review.');
      return;
    }
    setSaving(true);
    const res = await submitReviewAPI({
      name: form.name.trim(),
      role: form.role.trim(),
      quote: form.quote.trim(),
      rating: form.rating,
    });
    setSaving(false);
    if (res?.status === 200 || res?.status === 201) {
      const saved = res.data?.review;
      setReviews((prev) => [
        {
          name: saved?.role || saved?.name || form.role.trim() || form.name.trim(),
          quote: saved?.quote || form.quote.trim(),
          rating: saved?.rating || form.rating,
        },
        ...prev,
      ].slice(0, 4));
      setForm(emptyForm);
      setOpen(false);
      setDone('Thank you. Your review is now live.');
      return;
    }
    setError(res?.error || 'Could not save your review.');
  };

  return (
    <div className="about-reviews mt-4">
      <div className="about-reviews-head">
        <div>
          <p className="about-reviews-kicker mb-1">Guest reviews</p>
          <span className="about-reviews-score">{average} ★</span>
        </div>
        {!open && (
          <button type="button" className="about-review-add" onClick={() => setOpen(true)}>
            Add review
          </button>
        )}
      </div>

      {reviews.slice(0, 2).map((item) => (
        <div key={`${item.name}-${item.quote}`} className="about-review">
          <p>“{item.quote}”</p>
          <span>{item.name}</span>
        </div>
      ))}

      {done && <p className="about-review-note">{done}</p>}

      {open && (
        <form className="about-review-form" onSubmit={submit}>
          <div className="about-review-stars" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= form.rating ? 'is-on' : ''}
                onClick={() => setForm({ ...form, rating: star })}
                aria-label={`${star} stars`}
              >
                ★
              </button>
            ))}
          </div>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            maxLength={80}
          />
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="City or role (optional)"
            maxLength={80}
          />
          <textarea
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            placeholder="Share a short review"
            rows={2}
            maxLength={280}
          />
          {error && <p className="about-review-error">{error}</p>}
          <div className="about-review-actions">
            <button type="button" className="about-review-cancel" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="about-review-submit" disabled={saving}>
              {saving ? 'Saving...' : 'Submit review'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
