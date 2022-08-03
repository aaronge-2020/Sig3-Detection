const userUpload = document.getElementById("fileInput");
var reader = new FileReader();
const MODEL_URL = "/js/Models/NN/model.json";
var debug = null;
var progressBar = null;
var predictionBar = null;
var progress = 0;
var mutSpec = {};
userData = [];
var mutationalSpectrumMatrix = null;

$('#uploadProgress').hide();
$('#loadingUMAP').hide();
$('#results_text').hide();



function initializeProgressBar() {

    $('#uploadProgress').slideDown("slow");
    // $('#uploadProgress').append("<br> <br>");
    var bar = new ProgressBar.SemiCircle(uploadProgress, {
        strokeWidth: 6,
        color: '#FFEA82',
        trailColor: '#eee',
        trailWidth: 1,
        easing: 'easeInOut',
        duration: 1400,
        svgStyle: null,
        text: {
            value: '',
            alignToBottom: false
        },
        from: { color: '#FFEA82' },
        to: { color: '#ED6A5A' },
        // Set default step function for all animate calls
        step: (state, bar) => {
            bar.path.setAttribute('stroke', state.color);
            var value = Math.round(bar.value() * 100);
            if (value === 0) {
                bar.setText('');
            } else {
                bar.setText(value);
            }

            bar.text.style.color = state.color;
        }
    });
    bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    bar.text.style.fontSize = '2rem';

    progressBar = bar;
    

}

async function loadNNModel() {
    const model = await tf.loadLayersModel(MODEL_URL);
    return model;
}

async function loadTrainData() {

    $("#loadUMAP").hide();

    const trainData = Papa.parse("/Data/training_data.csv", {
        header: true,
        download: true,
        dynamicTyping: true,
        complete: function (results) {
            UMAPProjections(results.data)
        }
    });
}
const arrayColumn = (arr, n) => arr.map(x => x[n]);

async function UMAPProjections(data) {

    debug = data;
    $('#loadingUMAP').show();


    var transformed_data = [];
    is_sig3 = await d3.csv("/Data/is_sig3_20.csv");

    const umap = new UMAP({
        nComponents: 3,
        nNeighbors: 15,
    });

    var layout = {
        'autosize': true,
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
    };

    if (mutationalSpectrumMatrix != null) {

        data.push(mutationalSpectrumMatrix);

        const transformed = await umap.fitAsync(data, epochNumber => {
            // check progress and give user feedback, or return `false` to stop
        });


        var training_data = {
            x: arrayColumn(transformed.slice(0, -1), 0), y: arrayColumn(transformed.slice(0, -1), 1), z: arrayColumn(transformed.slice(0, -1), 2),
            mode: 'markers',
            marker: {
                size: 6,
                color: is_sig3.map(d => getColor(d)),
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Training Data'
        };

        var userData = {
            x: arrayColumn(transformed.slice(-1), 0), y: arrayColumn(transformed.slice(-1), 1), z: arrayColumn(transformed.slice(-1), 2),
            mode: 'markers',
            marker: {
                color: 'rgb(127, 127, 127)',
                size: 12,
                symbol: 'circle',
                line: {
                    color: 'rgb(204, 204, 204)',
                    width: 1
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Your Data'

        };
        transformed_data.push(training_data, userData);

    } else {
        const embedding = await umap.fitAsync(data, epochNumber => {
            // check progress and give user feedback, or return `false` to stop
        });

        var training_data = {
            x: arrayColumn(embedding, 0), y: arrayColumn(embedding, 1), z: arrayColumn(embedding, 2),
            mode: 'markers',
            marker: {
                size: 6,
                color: is_sig3.map(d => getColor(d)),
                line: {
                    color: 'rgba(217, 217, 217, 0.14)',
                    width: 0.5
                },
                opacity: 0.8
            },
            type: 'scatter3d',
            name: 'Training Data'
        };
        transformed_data.push(training_data);
    }
    $('#loadingUMAP').hide();

    Plotly.newPlot('umapGraph', transformed_data, layout);

}


function getColor(data) {
    // enter your conditional coloring code here
    if (data.is_sig3_20 == "FALSE") {
        return '#0000FF'
    }
    return '#FF0000';
}


function convert_mfa_to_mutational_spectrum(parsedData) {

    maf_file = d3.csvParse(parsedData);
    console.log(maf_file);
}
function get_sbs_trinucleotide_contexts() {
    /*
    Returns a list of trinucleotide context for single base substitutions (SBS)
    for constructing a COSMIC mutational spectra matrix.
     :return: a list of SBS trinucleotide contexts.
    */
    var nucleotide_bases, sbs_trinucleotide_contexts, substitution_types;
    sbs_trinucleotide_contexts = new Array();
    nucleotide_bases = ["A", "C", "G", "T"];
    substitution_types = ["C>A", "C>G", "C>T", "T>A", "T>C", "T>G"];

    for (var base_5, _pj_c = 0, _pj_a = nucleotide_bases, _pj_b = _pj_a.length; _pj_c < _pj_b; _pj_c += 1) {
        base_5 = _pj_a[_pj_c];

        for (var substitution, _pj_f = 0, _pj_d = substitution_types, _pj_e = _pj_d.length; _pj_f < _pj_e; _pj_f += 1) {
            substitution = _pj_d[_pj_f];

            for (var base_3, _pj_i = 0, _pj_g = nucleotide_bases, _pj_h = _pj_g.length; _pj_i < _pj_h; _pj_i += 1) {
                base_3 = _pj_g[_pj_i];
                sbs_trinucleotide_contexts.push(`${base_5}[${substitution}]${base_3}`);
            }
        }
    }

    return sbs_trinucleotide_contexts;
}


function standardize_substitution(ref_allele, mut_allele) {
    /*
    COSMIC signatures define mutations from a pyrimidine allele (C, T) to any
    other base (C>A, C>G, C>T, T>A, T>C, T>G). If a mutation in the MAF file
    is defined from a reference purine allele (A, G), then we infer the substituted
    base in the complementary sequence, which would be from a pyrimidine
    allele due to purines and pyrimidines complementing each other in a
    double-stranded DNA.
     :param ref_allele: base in the reference genome.
    :param mut_allele: base in the mutated genome
    :return: substitution string from pyrimidine to any other base.
    */
    var complement_seq, purines;
    complement_seq = {
        "A": "T",
        "C": "G",
        "T": "A",
        "G": "C"
    };
    purines = ["A", "G"];

    if (purines.some(v => ref_allele.includes(v))) {
        return `${complement_seq[ref_allele]}>${complement_seq[mut_allele]}`;
    } else {
        return `${ref_allele}>${mut_allele}`;
    }
}

function init_sbs_mutational_spectra(n_records) {
    /*
    Initilizes an ordered dictionary with SBS trinucleotide context as keys and
    a list of counts, one for each sample.
     :param n_records: number of samples to record in the mutational spectra matrix.
    :return: a dictionary of trinucleotide context and a list of counts
    initialized to zeros.
    */

    tri_nuc_context = get_sbs_trinucleotide_contexts();

    sbs_mutational_spectra = {};

    for (var i = 0; i < tri_nuc_context.length; i++) {
        context = tri_nuc_context[i];
        sbs_mutational_spectra[context] = 0;
    }

    return sbs_mutational_spectra;
}


function standardize_trinucleotide(trinucleotide_ref) {

    // COSMIC signatures define mutations from a pyrimidine allele (C, T) to any
    // other base (C>A, C>G, C>T, T>A, T>C, T>G). If a mutation in the MAF file
    // is defined from a purine allele (A, G), then we infer the trinucleotide
    // context in the complementary sequence, which would be from a pyrimidine
    // allele due to purines and pyrimidines complementing each other in a
    // double-stranded DNA.

    // :param trinucleotide_ref: trinucleotide sequence seen in the reference genome.
    // :return: a pyrimidine-centric trinucleotide sequence.

    complement_seq = {
        'A': 'T',
        'C': 'G',
        'T': 'A',
        'G': 'C'
    }
    purines = "AG"
    if (purines.includes(trinucleotide_ref[1])) {
        return `${complement_seq[trinucleotide_ref[2]]}${complement_seq[trinucleotide_ref[1]]}${complement_seq[trinucleotide_ref[0]]}`
    }
    else {
        return trinucleotide_ref
    }
}

function loadFile() {
    const file = userUpload.files[0];

    if (typeof file == 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Selected!',
            confirmButtonColor: '#2098ce',
        });
        return;
    }


    var type = document.getElementById("fileType");
    var fileType = type.value;

    if (fileType == "1") {
        
        reader.addEventListener("load", parseCSV, false);
        if (file) {
            reader.readAsText(file);
        }

    } else if (fileType == "2") {
        reader.addEventListener("load", parseMAF, false);
        if (file) {
            reader.readAsText(file);
        }
    } else {

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Type Selected!',
            confirmButtonColor: '#2098ce',
        })
    }


}

function parseCSV() {
    var data = d3.csvParse(reader.result);
    userData = data;

    mutationalSpectrumMatrix = userData.map((sample) =>{
        
        return Object.values(sample).splice(0,96).map((sample)=>{

        return Number(sample);
    })
    
    });

    

    Swal.fire({
        icon: 'success',
        title: 'Matrix Uploaded',
        showConfirmButton: true,
        confirmButtonColor: '#2098ce',

    });
}


function parseMAF() {
    var data = d3.tsvParse(reader.result);
    convertMatrix(data);
    userData = data;
}

async function convertMatrix(data) {
    var elem = document.getElementById("myBar");


    var mutationalSpectrum = init_sbs_mutational_spectra();
    initializeProgressBar();
    moveProgressBar();

    for (let i = 0; i < data.length; i++) {
        var chromosomeNumber = data[i]['Chromosome'];
        var referenceAllele = data[i]['Reference_Allele'];
        var mutatedTo = data[i]['Tumor_Seq_Allele2'];
        // Start Position is the same as end position, since these are SBS mutations
        var position = data[i]["Start_Position"];
        var variantType = data[i]["Variant_Type"];

        try {
            var sequence = await getMutationalContext(chromosomeNumber, parseInt(position));
            sequence = standardize_trinucleotide(sequence);
            fivePrime = sequence[0];
            threePrime = sequence[2];
            mutationType = String(`${fivePrime}[${standardize_substitution(referenceAllele, mutatedTo)}]${threePrime}`).toUpperCase()
            
            console.log(mutationType, position);

            if ((variantType == "SNP" || variantType == "single base substitution") && !mutationType.includes("N")) {
                mutationalSpectrum[mutationType] = Number(mutationalSpectrum[mutationType]) + Number(1);

                progress = (i + 1) / data.length;

                if (progress>0.95){
                    progress = 1;
                }
            }
        } catch (error) {
            console.error(error);

        }
    }
    mutationalSpectrumMatrix = mutationalSpectrum;
    Object.assign(mutSpec, mutationalSpectrumMatrix);
    for (key in mutSpec){   
        mutSpec[key.replace(/[^a-zA-Z ]/g, "")] = mutSpec[key];
        delete mutSpec[key];
    }

}

async function getMutationalContext(chromosomeNumber, startPosition) {


    const chrName = String(chromosomeNumber);
    const startByte = startPosition - 2;
    const endByte = startPosition;

    const msg = await (await fetch(`https://storage.googleapis.com/storage/v1/b/chaos-game-representation-grch37/o/chr${chrName}%2Fsequence.bin?alt=media`, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Range": `bytes=${startByte}-${endByte}`
        }
    })).arrayBuffer();
    const view = new DataView(msg);

    let seq = ""
    for (let i = 0; i < view.byteLength; i++) {
        seq += String.fromCharCode(view.getUint8(i));
    }

    return seq;

}

function moveProgressBar() {

    var id = setInterval(frame, 5000);
    function frame() {
        if (progress == 1.0) {
            progressBar.animate(progress);
            clearInterval(id);
            setTimeout(function () {
                Swal.fire({
                    icon: 'success',
                    title: 'MAF Processing Complete',
                    showConfirmButton: true,
                    confirmButtonColor: '#2098ce',

                })

                $('#uploadProgress').hide();
                progressBar.destroy();
            }, 2000);


        } else {
            console.log(progress);
            progressBar.animate(progress);
        }
    }
}


function formatMatrixForPrediction(matrix){

    matrix = Object.values(matrix);
    if (typeof(matrix[0].length) != "undefined"){
        data = tf.reshape(matrix,[matrix.length, 96,1])

    }else{
        data = tf.reshape(matrix,[1, 96,1])
    }

    return data;
}

async function generatePredictions() {

    if (mutationalSpectrumMatrix == null) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No File Has Been Processed!',
            confirmButtonColor: '#2098ce',
        })
        return;
    }


    var data = mutSpec;
    var type = document.getElementById("modelSelection");
    var modelType = type.value;


    var predicted_prob = 1;

    $('#results_text').show();

    if (modelType == "1") {
        data = formatMatrixForPrediction(mutSpec);

        NN = await loadNNModel();

        predicted_prob = NN.predict(data).arraySync()[0][0];

    } else if (modelType == "2") {

        console.log("xgboost model");
        var json = await $.getJSON("./js/xgboost-scorer/xgb.model.json");
        
        const scorer = await Scorer.create(json);

        predicted_prob = await scorer.score(data);

    } else if (modelType == "3") {
        data = Object.values(mutSpec);

        var json_knn = await d3.json("./js/Models/knn_algorithm.json");
        var knn_load = ML.KNN.load(json_knn);
        predicted_prob = knn_load.predict(data);

    } else {
        data = Object.values(mutSpec);
        data = new ML.Matrix([data])
        var json = await $.getJSON("./js/Models/LR.json");
        LR_model = mlLogisticRegression.load(json);
        predicted_prob = LR_model.predict(data);
    }

    console.log(predicted_prob);

    if (predictionBar != null){
        predictionBar.destroy();
    }
    var bar = new ProgressBar.Circle(results, {
        color: '#C70039',
        // This has to be the same size as the maximum width to
        // prevent clipping
        strokeWidth: 4,
        trailWidth: 1,
        easing: 'easeInOut',
        duration: 1400,
        text: {
            autoStyleContainer: true
        },
        from: { color: '#DAF7A6', width: 1 },
        to: { color: '#C70039', width: 3 },
        // Set default step function for all animate calls
        step: function (state, circle) {
            circle.path.setAttribute('stroke', state.color);
            circle.path.setAttribute('stroke-width', state.width);

            var value = Math.round(circle.value() * 100);
            if (value === 0) {
                circle.setText(value + "%");
            } else {
                circle.setText(value + "%");
            }

        }
    });
    bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
    bar.text.style.fontSize = '2rem';

    predictionBar = bar;

    predictionBar.animate(predicted_prob);  // Number from 0.0 to 1.0

}

