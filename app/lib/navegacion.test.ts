import { describe, expect, it } from "vitest";
import { enlaceGoogleMaps, enlaceWaze } from "./navegacion";

const u = { lat: 4.1420001, lng: -73.6266 };

describe("enlaces de navegación", () => {
  it("Google Maps va en carro hasta el destino, sin punto de partida", () => {
    expect(enlaceGoogleMaps(u)).toBe("https://www.google.com/maps/dir/?api=1&destination=4.142000,-73.626600&travelmode=driving");
  });
  it("Waze navega hasta el destino", () => {
    expect(enlaceWaze(u)).toBe("https://waze.com/ul?ll=4.142000,-73.626600&navigate=yes");
  });
});
