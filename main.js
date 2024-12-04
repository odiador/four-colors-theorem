import { Map, View } from 'ol';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { useGeographic } from 'ol/proj';
import OSM from 'ol/source/OSM';
import Vector from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

const departamentos = [];

useGeographic();

async function loadDepartamentos() {
  const response = await fetch('departamentos.geojson');
  const data = await response.json();

  data.features.forEach((feature) => {
    departamentos.push(
      new Feature({
        geometry: new Polygon(feature.geometry.coordinates),
        id: feature.id,
        properties: feature.properties,
        vecinos: feature.vecinos,
      })
    );
  });
}

function departamentoStyle(color) {

  return new Style({
    stroke: new Stroke({
      color: '#000000',
      width: 1,
    }),

    fill: new Fill({
      color: color,
    }),
  });
}

function colorearDepartamentos(departamentos, n) {
  // ordena los nodos de mayor a menor grado
  const nuevosDeptos = departamentos.sort((dept1, dept2) =>
    dept2.get('vecinos').length - dept1.get('vecinos').length)

  const coloresAsignados = {};

  // recorre n veces por diferentes colores para pintar el mapa completo
  for (let i = 0; i < n; i++) {

    // recorrre cada departamento para elegir los que no tengan vecinos con el color seleccionado
    for (let index = 0; index < nuevosDeptos.length; index++) {
      const depto = nuevosDeptos[index];
      // si no se encuentra asignado el color con el id del depto y los vecinos no tienen el color seleccionado
      if (!coloresAsignados[depto.get('id')] && verificarVecinos(depto, coloresAsignados, coloresDisponibles[i])) {
        // se asigna el color
        coloresAsignados[depto.get('id')] = coloresDisponibles[i];
      }
    }
  }
  return coloresAsignados;
}
// verifica si hay vecinos con el mismo color que el departamento
function verificarVecinos(depto, coloresAsign, color) {
  const vecinos = depto.get('vecinos');
  for (let index = 0; index < vecinos.length; index++) {
    const otroDepto = departamentos.find(depto => depto.get('properties')['DPTO_CNMBR'] == vecinos[index]);
    // retorna false si se encuentra un vecino con el mismo color que se busca
    if (otroDepto && color == coloresAsign[otroDepto.get('id')])
      return false;
  }
  return true;
}
loadDepartamentos().then(() => {
  for (let i = 0; i < 5; i++)
    cargarMapa(i);
});


// usa 4 colores 
const coloresDisponibles = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];

function cargarMapa(num) {
  const coloresAsignados = colorearDepartamentos(departamentos.slice(), num);
  var departamentosLayer = new VectorLayer({
    source: new Vector({ features: departamentos }),
    style: (feature) => {
      // se usa el color que se calculo en el metodo de colorear
      const color = coloresAsignados[feature.get('id')];
      return departamentoStyle(color);
    },
  });

  const map = new Map({
    target: 'map',
    layers: [
      // capa normal
      new TileLayer({
        source: new OSM(),
      }),
      // capa colores
      departamentosLayer
    ],

    view: new View({
      // ubica en colombia (no sirve si no se pone useGeographic() al inicio)
      center: [-74.24, 4.59],
      zoom: 6,
    }),
  });

  departamentosLayer.setOpacity(0.5);
  map.render('map');
}