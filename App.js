//Constantes y variables globales relacionadas con los inputs.
const INPUT_CANTIDAD = document.getElementById('input_cantidad');
const SELECTOR_MONEDA_ORIGEN = 'selector_moneda_origen';
const SELECTOR_MONEDA_DESTINO = 'selector_moneda_destino';
let SELECTORES_DIVISAS = {};
const BOTON_CONVERTIR = document.getElementById('boton_convertir');
const RESULTADO = document.getElementById('resultado');
let CURRENCIES = {}
let HISTORICO_DIVISAS = {}

//Constantes y variables globales relacionadas con la gráfica.
const N_FILAS = 15;
const N_COLUMNAS = 10;
const OFFSET_HORIZONTAL_TEXTO = 10;
const OFFSET_VERTICAL_TEXTO = 20;
const MARGENES_HORIZONTALES = [40 , 20];
const MARGENES_VERTICALES = [10,40];
const FECHA_INICIAL = '2021-01-01'
const MESES =['En', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ag', 'Sep', 'Oct', 'Nov', 'Dec'];
let fecha_actual = new Date();
let fecha_inicial_obj = new Date();




//Esta función inicializa las variables necesarias y conecta los eventos a los inputs para inicializar la app.
const init = async ()=>{
    let selectores_de_monedas = [...document.getElementsByClassName("selector-moneda")];
    SELECTORES_DIVISAS = selectores_de_monedas.reduce((diccionario,selector)=>{
        diccionario[selector.id]= selector;
        return diccionario;
},{});
    let conseguir_monedas = pideDatos('/currencies');
    for(selector of Object.values(SELECTORES_DIVISAS)){
        crear_opcion_default(selector);
    }
    await conseguir_monedas.then((monedas)=>{  
        CURRENCIES = monedas;
        Object.values(SELECTORES_DIVISAS).forEach((selector)=>{
            crear_opciones_monedas(selector);
            selector.addEventListener('change', (evento)=> validar_selectores());
            });
    }).catch((error) => window.alert(error));

    BOTON_CONVERTIR.addEventListener("click", (evento)=> convertir_cantidad());
    INPUT_CANTIDAD.addEventListener('change',(evento)=>validar_inputs(evento.target.value));

}

//Aquí se inicializa el canvas de la gráfica y ésta misma.
function setup(){
    const myCanvas = createCanvas(600, 400);
    myCanvas.parent('tabla');
    
    dibujar_grafica(0.5,2);
        
}


//Hace una request a la url de la api de frankfurter indicada y devuelve una promesa con la respuesta.
const pideDatos = (url) => {
    const host = 'api.frankfurter.app';
    return new Promise((resolve, reject) => {
        fetch(`https://${host}${url}`)
            .then(resp => resp.json())
            .then(
                (data) => {
                    resolve(data);
                },
                (error) => {
                    reject(error);
                }
            )
    })
}

//Esta función se llama al modificar el input de monedas y al pulsar en Convertir. En caso del input de monedas se le pasa
// el valor al que cambia.
function validar_inputs(cantidad = INPUT_CANTIDAD.value){
    let desactivar_convertir = true;
    let cantidad_no_es_numero = isNaN(cantidad);
    let cantidad_es_cero = (cantidad == 0);
    let selectores_validados = validar_selectores();
    if(cantidad_no_es_numero || cantidad_es_cero || !selectores_validados){
        desactivar_convertir = true;
    }
    else{
        desactivar_convertir = false;
    }

    BOTON_CONVERTIR.disabled = desactivar_convertir;
    return !desactivar_convertir;

}

function validar_selectores(){
    let opciones_seleccionadas = true;
    let opciones_repetidas = false;
    let opcion_aux='';
    for([key,selector] of Object.entries(SELECTORES_DIVISAS)){
        if(!selector.value){            
            opciones_seleccionadas = false;
            selector.setCustomValidity("Necesitas seleccionar una opción."); 
        }
        else{
            selector.setCustomValidity("");
        }
        if(opcion_aux.length>0 && opcion_aux == selector.value){
            opciones_repetidas = true;
            selector.setCustomValidity("Divisas repetidas."); 
        }
        opcion_aux = selector.value;
    }
    return (opciones_seleccionadas && !opciones_repetidas);
}


//Convierte la cantidad especificada en el input de cantidad, de la moneda de origen a la de destino seleccionadas.
//También llama a la funcion que añade los históricos de esas divisas y las pinta si fuese necesario.
const convertir_cantidad = async () =>{
    if (!validar_inputs()) return;

    let cantidad = parseFloat(INPUT_CANTIDAD.value);
    let moneda_origen = SELECTORES_DIVISAS[SELECTOR_MONEDA_ORIGEN].value;
    let moneda_destino = SELECTORES_DIVISAS[SELECTOR_MONEDA_DESTINO].value;
    let url = `/latest?amount=${cantidad}&from=${moneda_origen}&to=${moneda_destino}`;
    if(cantidad== 0){
        RESULTADO.textContent=0;
        return;
    }

    let pedir_conversion = pideDatos(url);
    pedir_conversion.then(datos=>{
        let cantidad_final = datos.rates[moneda_destino];
        RESULTADO.textContent=cantidad_final;
        pedir_evolucion_respecto_euro(moneda_origen);
        pedir_evolucion_respecto_euro(moneda_destino);
    }).catch(error => window.alert(error));

    
}
//Función para inicializar el selector con una opción vacía.
function crear_opcion_default(selector){
    let opcion_default = document.createElement('option');
    opcion_default.setAttribute('value','');
    let texto_opcion_default = document.createTextNode('Selecciona una divisa');
    opcion_default.appendChild(texto_opcion_default);
    selector.appendChild(opcion_default);
}

//Función para crear todas las opciones de divisas del selector que se le pase por parámetro.
function crear_opciones_monedas(selector){
    let monedas = Object.keys(CURRENCIES);
    for ( let clave_moneda of monedas){
        crear_opcion_en_selector(clave_moneda,selector);
    };
}
//Función que crea una opcion recibiendo la clave de la divisa y el selector al que pertenecerá.
function crear_opcion_en_selector(clave_moneda,selector){
    let opcion_moneda = document.createElement('option');
    opcion_moneda.setAttribute('value',clave_moneda);
    let texto_opcion_moneda = document.createTextNode(CURRENCIES[clave_moneda]);
    opcion_moneda.appendChild(texto_opcion_moneda);
    selector.appendChild(opcion_moneda);
}





//Si se ha añadido una moneda nueva a las conversiones y no es el Euro, pide la evolución de esa divisa
//respecto al Euro y actualiza la tabla
function pedir_evolucion_respecto_euro(moneda_a_comparar){

    let url = `/${FECHA_INICIAL}..?to=${moneda_a_comparar}`;
    if(moneda_a_comparar!='EUR' && !HISTORICO_DIVISAS[moneda_a_comparar]){
        let pedir_evolucion = pideDatos(url);    
        pedir_evolucion.then(datos=>{
            let  rates = Object.entries(datos.rates);
            let rates_salida = rates.map(rate => {return({'fecha':rate[0],'rate':rate[1][moneda_a_comparar]})});
            HISTORICO_DIVISAS[moneda_a_comparar]= rates_salida;

            dibujar_resultados_y_grafica();
        }).catch(error => window.alert(error));
    }
}



//Dibuja una gráfica para el rango de meses especificado con los valores mínimos y máximos que se le pasen
function dibujar_grafica(valor_min, valor_max){
    background(128,128,128);
    stroke(0,0,0);
    fill(0,0,0);
    strokeWeight(1);
    let rango_vertical = Array.from(Array(N_FILAS).keys());
    for(indice_vertical in rango_vertical){
        
        let posicion_en_y = map(height - (indice_vertical * height)/N_FILAS, 0, height,MARGENES_VERTICALES[0],height-MARGENES_VERTICALES[1]);
        let texto_valor = parseFloat(map(indice_vertical,0,N_FILAS-1,valor_min,valor_max)).toFixed(2);
        text(texto_valor, OFFSET_HORIZONTAL_TEXTO, posicion_en_y);
        line(MARGENES_HORIZONTALES[0],posicion_en_y,width-MARGENES_HORIZONTALES[1],posicion_en_y);
    }

    let [year_inicial, mes_inicial, dia_inicial] = FECHA_INICIAL.split('-');
    fecha_inicial_obj.setYear(year_inicial);
    fecha_inicial_obj.setMonth(parseInt(mes_inicial)-1);
    fecha_inicial_obj.setDate(dia_inicial);
    
    let year_actual = fecha_actual.getUTCFullYear();
    let mes_actual = fecha_actual.getMonth();
    let n_meses = 12*(year_actual-year_inicial) + mes_actual + 1 - (parseInt(mes_inicial)-1);

    let rango_horizontal = Array.from(Array(n_meses).keys());
    for(let indice_mes in rango_horizontal){
        let indice_year = parseInt(indice_mes/12) + parseInt(year_inicial);
        let numero_mes = indice_mes % 12 ;
        let fecha_aux = new Date();
        fecha_aux.setYear(indice_year)
        fecha_aux.setMonth(numero_mes);
        fecha_aux.setDate(1);
        let milisegundos_fecha = fecha_aux.getTime();
        let posicion_en_x = calcular_posicion_x_en_tabla(milisegundos_fecha);
        text(MESES[numero_mes], posicion_en_x, height-MARGENES_VERTICALES[1]+OFFSET_VERTICAL_TEXTO);

        line(posicion_en_x,MARGENES_VERTICALES[0],posicion_en_x,height-MARGENES_VERTICALES[1]);
    }

}

//Dibuja la gráfica y la representación de los resultados sobre ella
function dibujar_resultados_y_grafica(){
    let lista_historicos = []
    for(let lista_divisa of Object.values(HISTORICO_DIVISAS)){
        lista_historicos.push(...[lista_divisa]);
    }
    let rates_ordenadas_por_valor = lista_historicos.reduce((acumulador,actual)=>{
        acumulador.push(...actual);
        return acumulador;
    },[]);
    rates_ordenadas_por_valor.sort((a,b)=> a.rate - b.rate );
    let min_value = rates_ordenadas_por_valor[0].rate;
    let max_value = rates_ordenadas_por_valor[rates_ordenadas_por_valor.length-1].rate;

    dibujar_grafica(min_value,max_value);

    strokeWeight(3);
    let posicion_texto_en_x = MARGENES_HORIZONTALES[0];
    for(let [divisa, historico] of Object.entries(HISTORICO_DIVISAS)){
        let rojo = random(255);
        let verde = random(255);
        let azul = random(255);
        fill(rojo, verde, azul)
        noStroke()
        text(divisa,posicion_texto_en_x,height-5);
        posicion_texto_en_x += 30;
        stroke(rojo, verde, azul);
        historico.reduce((previa,actual)=>{
            let tiempo_inicio = fecha_en_cadena_a_tiempo(previa.fecha);
            let tiempo_fin = fecha_en_cadena_a_tiempo(actual.fecha);
            let posicion_en_x_inicio = calcular_posicion_x_en_tabla(tiempo_inicio);
            let posicion_en_x_fin = calcular_posicion_x_en_tabla(tiempo_fin);
            let posicion_en_y_inicio = map(previa.rate,min_value,max_value,height-MARGENES_VERTICALES[1],MARGENES_VERTICALES[0]);
            let posicion_en_y_fin = map(actual.rate,min_value,max_value,height-MARGENES_VERTICALES[1],MARGENES_VERTICALES[0]);
            line(posicion_en_x_inicio,posicion_en_y_inicio,posicion_en_x_fin,posicion_en_y_fin);
            return actual ;
        }, historico[0]);
    }
}

//Convierte string con fecha en formato AAAA-MM-DD a tiempo en milisegundos
function fecha_en_cadena_a_tiempo(fecha){
    let [year_inicial, mes_inicial, dia_inicial] = fecha.split('-');
    let date = new Date();
    date.setYear(year_inicial);
    date.setMonth(parseInt(mes_inicial)-1);
    date.setDate(dia_inicial);
    
    return date.getTime();
}

//Calcula la posición de una fecha en el eje de las x de la tabla.
function calcular_posicion_x_en_tabla(fecha_en_milisegundos){
    let milisegundos_inicio = fecha_inicial_obj.getTime();
    let milisegundos_final = fecha_actual.getTime();
    return map(fecha_en_milisegundos,milisegundos_inicio,milisegundos_final,MARGENES_HORIZONTALES[0],width-MARGENES_HORIZONTALES[1])
}



//Llamada a la inicialización de la aplicación
init();



/*
Estas funciones se utilizaban originalmente porque la lógica consistía en actualizar las opciones para evitar
que hubiese divisas repetidas en los selectores. Aunque siguiendo la guía de la práctica las he descartado para cambiar
la lógica por una que valide si las opciones son correctas y habilite o no el botón de convertir.

function actualizar_monedas_selector_opuesto(valor_seleccionado, selector_opuesto){
    let monedas = conseguir_diccionario_sin_clave(CURRENCIES, valor_seleccionado);
    actualizar_monedas_selector(selector_opuesto,monedas);
}

function actualizar_monedas_selector(selector,diccionario_monedas){
    let opciones_selector = Array.from(selector.children);
    let lista_monedas = Object.keys(diccionario_monedas);
    let opciones_a_eliminar = opciones_selector.filter((opcion)=> lista_monedas.indexOf(opcion.value)==-1);
    let valor_opciones_selector = opciones_selector.map((opcion)=>opcion.value);
    opciones_a_eliminar.map((opcion)=>selector.removeChild(selector.children[opcion.index]));
    let claves_opciones_a_crear = lista_monedas.filter((moneda)=> valor_opciones_selector.indexOf(moneda)==-1);
    claves_opciones_a_crear.map((clave)=>crear_opcion_en_selector(clave, selector));

    reordenar_opciones_selector(selector);
    
}

function reordenar_opciones_selector(selector){
    let opciones = [...selector.children];
    opciones.sort((a,b)=> a.value>b.value?1:-1);
    opciones.forEach((opcion)=>selector.appendChild(opcion));
}

function conseguir_diccionario_sin_clave(diccionario, clave_a_excluir){

    let diccionario_resultado = Object.keys(diccionario).reduce((acumulador,clave)=>{        
        if(clave != clave_a_excluir){
            acumulador[clave]=diccionario[clave];
        }
        return acumulador;
    },{});
    return diccionario_resultado
}

*/