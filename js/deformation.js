import * as THREE from "three"
import { lowSlider, midSlider, highSlider, phaseSlider } from "./setup.js"

export function deformMeshWithAudio(mesh, lowFreq, midFreq, highFreq) {
    const attributes = mesh.geometry.attributes
    const positions = attributes.position.array
    const normals = attributes.normal.array
    const originalPositions = attributes.originalPosition.array
    const center = new THREE.Vector3(...attributes.center.array)

    // if (!positions) return;

    const highFactor = highFreq * 0.03;
    const midFactor = midFreq * 0.03;
    const lowFactor = lowFreq * 0.03;

    for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i];
        const y = originalPositions[i + 1];
        const z = originalPositions[i + 2];
        const xyz = new THREE.Vector3(x, y, z)

        const normal = new THREE.Vector3(
            normals[i],
            normals[i + 1],
            normals[i + 2]
        );

        const temp = new THREE.Vector3(
            x - center.x,
            y - center.y,
            z - center.z
        )
        const r = temp.length()
        const [thetaPhase, phiPhase] = phaseSlider
        // const phi = Math.atan2(temp.y, temp.x) + (phiPhase);
        // const theta = Math.acos(temp.z / r) + (thetaPhase);
        let theta = 1.826, phi = -.921

        const l = Math.floor(lowFreq * 4);
        const m = Math.floor(midFreq * 4) - l;

        const Ylm = SH(l, m, theta, phi);
        const scalingFactor = 1 + highFactor * Ylm;

        const phaseScale = 0.5
        const [l1, m1, lowmag] = lowSlider
        const [l2, m2, midmag] = midSlider
        const [l3, m3, highmag] = highSlider

        var lowharmonic = (SH(l1, m1, theta, phi + (lowFreq * phaseScale))) * (r ** lowmag * 2);
        var midharmonic = (SH(l2, m2, theta, phi + midFreq * phaseScale)) * (r ** midmag * 2);
        var highharmonic = (SH(l3, m3, theta, phi + highFreq * phaseScale)) * (r ** highmag * 2);

        // Modulate the vertex normals using spherical harmonics
        console.log(scalingFactor)
        const modulatedNormal = normal.clone().multiplyScalar(scalingFactor);

        positions[i] = positions[i] * 2

        // positions[i] = i / (positions.length / 3)// SH(3, 9, 1.826, -.921) * Math.sin(1.826) * Math.cos(-.921);
        // positions[i + 1] = (i + 1) / (positions.length / 3)// SH(3, 9, 1.826, -.921) * Math.sin(1.826) * Math.sin(-.921);
        // positions[i + 2] = (i + 2) / (positions.length / 3) //SH(3, 9, 1.826, -.921) * Math.cos(1.826);

        // console.log(positions[i])

        // console.log(positions[i], positions[i + 1], positions[i + 2])
        // positions[i] = x + modulatedNormal.x * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
        // positions[i + 1] = y + modulatedNormal.y * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
        // positions[i + 2] = z + modulatedNormal.z * (lowFactor * lowharmonic + midFactor * midharmonic + highFactor * highharmonic);
    }

    console.log(mesh)

    throw "banana"
    mesh.geometry.attributes.position.needsUpdate = true
    mesh.geometry.computeVertexNormals()
}

// Renormalisation constant for SH function
function K(l, m) {
    const temp = ((2.0 * l + 1.0) * factorial(l - m)) / (4.0 * Math.PI * factorial(l + m));   // Here, you can use a precomputed table for factorials
    return Math.sqrt(temp);
}

// Evaluate an Associated Legendre Polynomial P(l,m,x) at x
// For more, see “Numerical Methods in C: The Art of Scientific Computing”, Cambridge University Press, 1992, pp 252-254 
function P(l, m, x) {
    let pmm = 1.0;
    if (m > 0) {
        const somx2 = Math.sqrt((1.0 - x) * (1.0 + x));
        let fact = 1.0;
        for (let i = 1; i <= m; i++) {
            pmm *= (-fact) * somx2;
            fact += 2.0;
        }
    }
    if (l == m)
        return pmm;

    let pmmp1 = x * (2.0 * m + 1.0) * pmm;
    if (l == m + 1)
        return pmmp1;

    let pll = 0.0;
    for (let ll = m + 2; ll <= l; ++ll) {
        pll = ((2.0 * ll - 1.0) * x * pmmp1 - (ll + m - 1.0) * pmm) / (ll - m);
        pmm = pmmp1;
        pmmp1 = pll;
    }

    return pll;
}

// Returns a point sample of a Spherical Harmonic basis function
// l is the band, range [0..N]
// m in the range [-l..l]
// theta in the range [0..Pi]
// phi in the range [0..2*Pi]
function SH(l, m, theta, phi) {
    const sqrt2 = Math.sqrt(2.0);
    if (m == 0) return K(l, 0) * P(l, m, Math.cos(theta));
    else if (m > 0) return sqrt2 * K(l, m) * Math.cos(m * phi) * P(l, m, Math.cos(theta));
    else return sqrt2 * K(l, -m) * Math.sin(-m * phi) * P(l, -m, Math.cos(theta));
}

// const cachedSH = {}; // memorization to speed up the process of computing SH values
// const cachedLegendrePolynomials = {}; // memorization to speed up the process of computing LegendrePolynomials

// function K(l, m) {
//     var temp = ((2.0 * l + 1.0) * factorial(l - m)) / (4.0 * Math.PI * factorial(l + m));   // Here, you can use a precomputed table for factorials
//     return (temp) ** 0.5;
// }


// function P(l, m, cosTheta) {
//     // TODO: consier quantize cosTheta if performance is an issue
//     // if (cachedLegendrePolynomials[l] && cachedLegendrePolynomials[l][m] && cachedLegendrePolynomials[l][m][cosTheta] !== undefined) {
//     //     // BUG: caches are always zero
//     //     return cachedLegendrePolynomials[l][m][cosTheta];
//     // }
//     // else {
//     var pmm = 1.0;

//     if (m > 0) {
//         var somx2 = ((1.0 - cosTheta) * (1.0 + cosTheta)) ** 0.5;
//         var fact = 1.0;
//         for (var iter = 1; iter <= m; iter++) {
//             pmm *= (-fact) * somx2;
//             fact += 2.0;
//         }
//     }

//     if (l == m) {
//         return pmm;
//     }

//     var pmmp1 = cosTheta * (2.0 * m + 1.0) * pmm;

//     if (l == m + 1) {
//         return pmmp1;
//     }

//     var pll = 0.0;
//     for (var ll = m + 2; ll <= l; ll++) {
//         pll = ((2.0 * ll - 1.0) * cosTheta * pmmp1 - (ll + m - 1.0) * pmm) / (ll - m);
//         pmm = pmmp1;
//         pmmp1 = pll;
//     }

//     console.log(pll)

//     // if (!cachedLegendrePolynomials[l]) {
//     //     cachedLegendrePolynomials[l] = {};
//     // }
//     // if (!cachedLegendrePolynomials[l][m]) {
//     //     cachedLegendrePolynomials[l][m] = {};
//     // }
//     // cachedLegendrePolynomials[l][m][cosTheta] = pll;
//     return pll;
//     // }
// }

// function SH(l, m, theta, phi) {
//     // TODO: consider quantize theta and phi if performance is an issue

//     const key = `${l}_${m}_${theta}_${phi}`;

//     if (cachedSH[key] !== undefined) {
//         return cachedSH[key];
//     }

//     const sqrt2 = Math.sqrt(2.0);
//     let result;

//     if (m === 0) {
//         result = K(l, 0) * P(l, m, Math.cos(theta));
//     } else if (m > 0) {
//         result = sqrt2 * K(l, m) * Math.cos(m * phi) * P(l, m, Math.cos(theta));
//     } else {
//         result = sqrt2 * K(l, -m) * Math.sin(-m * phi) * P(l, -m, Math.cos(theta));
//     }

//     cachedSH[key] = result;
//     return result;
// }

function factorial(n, r = 1) {
    while (n > 0) r *= n--;
    return r;
}