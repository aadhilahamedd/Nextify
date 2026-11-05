import { getCarImageUrl } from '../../utils/carsStorage';
import { getInquiryVehicleLabel, getVehicleCapacity } from '../../utils/inquiryTransfer';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateVehicle } from '../../i18n/places';
import { BriefcaseIcon, UsersIcon } from '../icons';

export default function InquiryVehicleGrid({
  vehicles = [],
  value,
  serviceType,
  onChange,
}) {
  const { t } = useLanguage();

  return (
    <div>
      <p className="book-hint mb-3">{t('booking.inquiryChauffeurNote')}</p>
      <div className="book-inquiry-vehicles">
        {vehicles.map((vehicle) => {
          const capacity = getVehicleCapacity(vehicle.category);
          const selected = value === vehicle.category;
          const displayName = getInquiryVehicleLabel(vehicle, serviceType);
          const translated = translateVehicle(vehicle.category, displayName, t);
          const name = vehicle.category === 'gmc' || vehicle.category === 'mercedes_vito'
            ? displayName
            : translated;
          return (
            <article key={vehicle.category} className={`book-inquiry-vehicle${selected ? ' is-selected' : ''}`}>
              <div className="book-inquiry-vehicle-media">
                <img src={getCarImageUrl(vehicle.image)} alt={name} />
              </div>
              <div className="book-inquiry-vehicle-body">
                <p className="book-inquiry-vehicle-class">{vehicle.fleetClass}</p>
                <h4 className="book-inquiry-vehicle-name">{name}</h4>
                <div className="book-inquiry-vehicle-meta">
                  {capacity.seats ? (
                    <span><UsersIcon size={14} /> {capacity.seats}</span>
                  ) : null}
                  {capacity.luggage ? (
                    <span><BriefcaseIcon size={14} /> {capacity.luggage}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`book-inquiry-select${selected ? ' is-active' : ''}`}
                  onClick={() => onChange(vehicle)}
                >
                  {selected ? t('booking.vehicleSelected') : t('booking.selectVehicle')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
