import React, { useState } from "react";

const BikeForm = ({ onAddBike }) => {
  const [bike, setBike] = useState({ name: "", barcode: "", priceHour: "", priceDay: "" });

  const handleChange = (e) => {
    setBike({ ...bike, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddBike(bike);
    setBike({ name: "", barcode: "", priceHour: "", priceDay: "" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={bike.name}
        onChange={handleChange}
        placeholder="Nome bici"
        required
      />
      <input
        type="text"
        name="barcode"
        value={bike.barcode}
        onChange={handleChange}
        placeholder="Scansiona barcode con pistola"
        required
      />
      <input
        type="number"
        name="priceHour"
        value={bike.priceHour}
        onChange={handleChange}
        placeholder="Prezzo orario"
        required
      />
      <input
        type="number"
        name="priceDay"
        value={bike.priceDay}
        onChange={handleChange}
        placeholder="Prezzo giornaliero"
        required
      />
      <button type="submit">Aggiungi bici</button>
    </form>
  );
};

export default BikeForm;
