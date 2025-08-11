import './3player.css'

const addSquareIds = (svgString) => {
  return svgString.replace(
    /<polygon ([^>]*?)><\/polygon>\s*<text[^>]*>([^<]*)<\/text>/g,
    (match, polygonAttrs, textContent) => {
      // Extract the square name
      const squareName = textContent.replace(/<!--\s*-->/g, '').trim();
      const polygonWithId = `<polygon ${polygonAttrs} id="square-${squareName}"></polygon>`;
      const textElement = match.substring(match.indexOf('<text'));
      return polygonWithId + '\n  ' + textElement;
    }
  );
};

const rawSvgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg"
     class="select-none h-full w-full"
     viewBox="0 0 960 831.3843876330611">

  <!-- Row L -->
  <polygon points="300,0 240,0 210,51.96152422706632 277.5,64.9519052838329" fill="var(--bg-color)"></polygon>
  <text x="245" y="41.47595264191645" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">L8</text>

  <polygon points="360,0 300,0 277.5,64.9519052838329 345,77.94228634059948" fill="var(--accent-bg)"></polygon>
  <text x="308.75" y="47.97114317029974" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">L7</text>

  <polygon points="420,0 360,0 345,77.94228634059948 412.5,90.93266739736606" fill="var(--bg-color)"></polygon>
  <text x="372.5" y="54.46633369868303" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">L6</text>

  <polygon points="480,0 420,0 412.5,90.93266739736606 480,103.92304845413264" fill="var(--accent-bg)"></polygon>
  <text x="436.25" y="60.96152422706632" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">L5</text>

  <polygon points="480,0 540,0 547.5,90.93266739736606 480,103.92304845413264" fill="var(--bg-color)"></polygon>
  <text x="503.75" y="60.96152422706632" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">L9</text>

  <polygon points="540,0 600,0 615,77.94228634059948 547.5,90.93266739736606" fill="var(--accent-bg)"></polygon>
  <text x="567.5" y="54.46633369868303" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">L10</text>

  <polygon points="600,0 660,0 682.5,64.9519052838329 615,77.94228634059948" fill="var(--bg-color)"></polygon>
  <text x="631.25" y="47.97114317029974" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">L11</text>

  <polygon points="660,0 720,0 750,51.96152422706632 682.5,64.9519052838329" fill="var(--accent-bg)"></polygon>
  <text x="695" y="41.47595264191645" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">L12</text>

  <!-- Row K -->
  <polygon points="277.5,64.9519052838329 210,51.96152422706632 180,103.92304845413264 255,129.90381056766574" fill="var(--accent-bg)"></polygon>
  <text x="218.75" y="99.93266739736603" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">K8</text>

  <polygon points="345,77.94228634059948 277.5,64.9519052838329 255,129.90381056766574 330,155.8845726811989" fill="var(--bg-color)"></polygon>
  <text x="290" y="119.4182389825159" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">K7</text>

  <polygon points="412.5,90.93266739736606 345,77.94228634059948 330,155.8845726811989 405,181.8653347947321" fill="var(--accent-bg)"></polygon>
  <text x="361.25" y="138.9038105676658" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">K6</text>

  <polygon points="480,103.92304845413264 412.5,90.93266739736606 405,181.8653347947321 480,207.84609690826525" fill="var(--bg-color)"></polygon>
  <text x="432.5" y="158.38938215281564" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">K5</text>

  <polygon points="480,103.92304845413264 547.5,90.93228634059948 555,181.8653347947321 480,207.84609690826525" fill="var(--accent-bg)"></polygon>
  <text x="507.5" y="158.38938215281564" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">K9</text>

  <polygon points="547.5,90.93228634059948 615,77.94228634059948 630,155.8845726811989 555,181.8653347947321" fill="var(--bg-color)"></polygon>
  <text x="578.75" y="138.9038105676658" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">K10</text>

  <polygon points="615,77.94228634059948 682.5,64.9519052838329 705,129.90381056766574 630,155.8845726811989" fill="var(--accent-bg)"></polygon>
  <text x="650" y="119.4182389825159" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">K11</text>

  <polygon points="682.5,64.9519052838329 750,51.96152422706632 780,103.92304845413264 705,129.90381056766574" fill="var(--bg-color)"></polygon>
  <text x="721.25" y="99.93266739736603" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">K12</text>

  <!-- Row J -->
  <polygon points="255,129.90381056766574 180,103.92304845413264 150,155.8845726811989 232.5,194.85571585149864" fill="var(--bg-color)"></polygon>
  <text x="192.5" y="158.38938215281564" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">J8</text>

  <polygon points="330,155.8845726811989 255,129.90381056766574 232.5,194.85571585149864 315,233.82685902179838" fill="var(--accent-bg)"></polygon>
  <text x="271.25" y="190.86533479473206" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">J7</text>

  <polygon points="405,181.8653347947321 330,155.8845726811989 315,233.82685902179838 397.5,272.7980021920981" fill="var(--bg-color)"></polygon>
  <text x="350" y="223.3412874366485" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">J6</text>

  <polygon points="480,207.84609690826525 405,181.8653347947321 397.5,272.7980021920981 480,311.76914536239786" fill="var(--accent-bg)"></polygon>
  <text x="428.75" y="255.81724007856496" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">J5</text>

  <polygon points="480,207.84609690826525 555,181.8653347947321 562.5,272.7980021920981 480,311.76914536239786" fill="var(--bg-color)"></polygon>
  <text x="511.25" y="255.81724007856496" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">J9</text>

  <polygon points="555,181.8653347947321 630,155.8845726811989 645,233.82685902179838 562.5,272.7980021920981" fill="var(--accent-bg)"></polygon>
  <text x="590" y="223.3412874366485" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">J10</text>

  <polygon points="630,155.8845726811989 705,129.90381056766574 727.5,194.85571585149864 645,233.82685902179838" fill="var(--bg-color)"></polygon>
  <text x="668.75" y="190.86533479473206" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">J11</text>

  <polygon points="705,129.90381056766574 780,103.92304845413264 810,155.8845726811989 727.5,194.85571585149864" fill="var(--accent-bg)"></polygon>
  <text x="747.5" y="158.38938215281564" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">J12</text>

  <!-- Row I -->

  <polygon points="232.5,194.85571585149864 150,155.8845726811989 120,207.84609690826525 210,259.80762113533154" fill="var(--accent-bg)"></polygon>
  <text x="166.25" y="216.84609690826522" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">I8</text>

  <polygon points="315,233.82685902179838 232.5,194.85571585149864 210,259.80762113533154 300,311.76914536239786" fill="var(--bg-color)"></polygon>
  <text x="252.5" y="262.3124306069483" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">I7</text>

  <polygon points="397.5,272.7980021920981 315,233.82685902179838 300,311.76914536239786 390,363.7306695894642" fill="var(--accent-bg)"></polygon>
  <text x="338.75" y="307.7787643056313" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">I6</text>

  <polygon points="480,311.76914536239786 397.5,272.7980021920981 390,363.7306695894642 480,415.6921938165305" fill="var(--bg-color)"></polygon>
  <text x="425" y="353.2450980043143" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">I5</text>

  <polygon points="480,311.76914536239786 562.5,272.7980021920981 570,363.7306695894642 480,415.6921938165305" fill="var(--accent-bg)"></polygon>
  <text x="515" y="353.2450980043143" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">I9</text>
  
  <polygon points="562.5,272.7980021920981 645,233.82685902179838 660,311.76914536239786 570,363.7306695894642" fill="var(--bg-color)"></polygon>
  <text x="601.25" y="307.7787643056313" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">I10</text>

  <polygon points="645,233.82685902179838 727.5,194.85571585149864 750,259.80762113533154 660,311.76914536239786" fill="var(--accent-bg)"></polygon>
  <text x="687.5" y="262.3124306069483" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">I11</text>

  <polygon points="727.5,194.85571585149864 810,155.8845726811989 840,207.84609690826525 750,259.80762113533154" fill="var(--bg-color)"></polygon>
  <text x="773.75" y="216.84609690826522" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">I12</text>

  <!-- Row H -->

  <polygon points="930,467.6537180435967 960,415.6921938165304 930,363.73066958946407 885,415.6921938165304" fill="var(--bg-color)"></polygon>
  <text x="912.5" y="424.6921938165304" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">H12</text>

  <polygon points="900,519.615242270663 930,467.6537180435967 885,415.6921938165304 840,467.6537180435967" fill="var(--accent-bg)"></polygon>
  <text x="875" y="476.65371804359665" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">H11</text>

  <polygon points="870,571.5767664977293 900,519.615242270663 840,467.6537180435967 795,519.615242270663" fill="var(--bg-color)"></polygon>
  <text x="837.5" y="528.615242270663" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">H10</text>

  <polygon points="840,623.5382907247956 870,571.5767664977293 795,519.615242270663 750,571.5767664977294" fill="var(--accent-bg)"></polygon>
  <text x="800" y="580.5767664977293" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">H9</text>

  <polygon points="840,623.5382907247956 810,675.4998149518619 727.5,636.5286717815623 750,571.5767664977294" fill="var(--bg-color)"></polygon>
  <text x="773.75" y="632.5382907247956" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">H4</text>

  <polygon points="810,675.4998149518619 780,727.4613391789283 705,701.4805770653952 727.5,636.5286717815623" fill="var(--accent-bg)"></polygon>
  <text x="747.5" y="690.9950054802453" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">H3</text>

  <polygon points="780,727.4613391789283 750,779.4228634059946 682.5,766.432482349228 705,701.4805770653952" fill="var(--bg-color)"></polygon>
  <text x="721.25" y="749.4517202356949" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">H2</text>

  <polygon points="750,779.4228634059946 720,831.3843876330609 660,831.3843876330609 682.5,766.432482349228" fill="var(--accent-bg)"></polygon>
  <text x="695" y="807.9084349911445" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">H1</text>

  <!-- Row G -->

  <polygon points="885,415.6921938165304 930,363.73066958946407 900,311.7691453623978 840,363.7306695894641" fill="var(--accent-bg)"></polygon>
  <text x="875" y="372.7306695894641" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">G12</text>

  <polygon points="840,467.6537180435967 885,415.6921938165304 840,363.7306695894641 780,415.69219381653045" fill="var(--bg-color)"></polygon>
  <text x="822.5" y="424.69219381653045" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">G11</text>

  <polygon points="795,519.615242270663 840,467.6537180435967 780,415.69219381653045 720,467.65371804359677" fill="var(--accent-bg)"></polygon>
  <text x="770" y="476.6537180435967" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">G10</text>

  <polygon points="750,571.5767664977294 795,519.615242270663 720,467.65371804359677 660,519.6152422706631" fill="var(--bg-color)"></polygon>
  <text x="717.5" y="528.6152422706631" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">G9</text>

  <polygon points="750,571.5767664977294 727.5,636.5286717815623 645,597.5575286112626 660,519.6152422706631" fill="var(--accent-bg)"></polygon>
  <text x="687.5" y="587.0719570261126" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">G4</text>

  <polygon points="727.5,636.5286717815623 705,701.4805770653952 630,675.499814951862 645,597.5575286112626" fill="var(--bg-color)"></polygon>
  <text x="668.75" y="658.5190528383289" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">G3</text>

  <polygon points="705,701.4805770653952 682.5,766.432482349228 615.0000000000001,753.4421012924615 630,675.499814951862" fill="var(--accent-bg)"></polygon>
  <text x="650" y="729.966148650545" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">G2</text>

  <polygon points="682.5,766.432482349228 660,831.3843876330609 600,831.3843876330609 615.0000000000001,753.4421012924615" fill="var(--bg-color)"></polygon>
  <text x="631.25" y="801.4132444627612" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">G1</text>

  <!-- Row F -->

  <polygon points="840,363.7306695894641 900,311.7691453623978 870,259.8076211353315 795,311.7691453623978" fill="var(--bg-color)"></polygon>
  <text x="837.5" y="320.7691453623978" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">F12</text>

  <polygon points="780,415.69219381653045 840,363.7306695894641 795,311.7691453623978 720,363.7306695894641" fill="var(--accent-bg)"></polygon>
  <text x="770" y="372.7306695894641" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">F11</text>

  <polygon points="720,467.65371804359677 780,415.69219381653045 720,363.7306695894641 645,415.69219381653045" fill="var(--bg-color)"></polygon>
  <text x="702.5" y="424.69219381653045" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">F10</text>

  <polygon points="660,519.6152422706631 720,467.65371804359677 645,415.69219381653045 570,467.6537180435968" fill="var(--accent-bg)"></polygon>
  <text x="635" y="476.65371804359677" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">F9</text>

  <polygon points="660,519.6152422706631 645,597.5575286112626 562.5,558.5863854409629 570,467.6537180435968" fill="var(--bg-color)"></polygon>
  <text x="601.25" y="541.6056233274297" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">F4</text>

  <polygon points="645,597.5575286112626 630,675.499814951862 555.0000000000001,649.5190528383289 562.5,558.5863854409629" fill="var(--accent-bg)"></polygon>
  <text x="590" y="626.0431001964125" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">F3</text>

  <polygon points="630,675.499814951862 615.0000000000001,753.4421012924615 547.5000000000001,740.4517202356949 555.0000000000001,649.5190528383289" fill="var(--bg-color)"></polygon>
  <text x="578.75" y="710.4805770653952" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">F2</text>

  <polygon points="615.0000000000001,753.4421012924615 600,831.3843876330609 540.0000000000001,831.384387633061 547.5000000000001,740.4517202356949" fill="var(--accent-bg)"></polygon>
  <text x="567.5000000000001" y="794.9180539343779" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">F1</text>

  <!-- Row E -->

  <polygon points="795,311.7691453623978 870,259.8076211353315 839.9999999999999,207.84609690826517 750,259.8076211353315" fill="var(--accent-bg)"></polygon>
  <text x="800" y="268.8076211353315" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">E12</text>

  <polygon points="720,363.7306695894641 795,311.7691453623978 750,259.8076211353315 660,311.7691453623978" fill="var(--bg-color)"></polygon>
  <text x="717.5" y="320.7691453623978" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">E11</text>

  <polygon points="645,415.69219381653045 720,363.7306695894641 660,311.7691453623978 570,363.7306695894642" fill="var(--accent-bg)"></polygon>
  <text x="635" y="372.7306695894641" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">E10</text>

  <polygon points="570,467.6537180435968 645,415.69219381653045 570,363.7306695894642 480,415.6921938165305" fill="var(--bg-color)"></polygon>
  <text x="552.5" y="424.6921938165305" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">E9</text>

  <polygon points="570,467.6537180435968 562.5,558.5863854409629 480,519.6152422706631 480,415.6921938165305" fill="var(--accent-bg)"></polygon>
  <text x="515" y="496.1392896287467" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">E4</text>

  <polygon points="562.5,558.5863854409629 555.0000000000001,649.5190528383289 480.00000000000006,623.5382907247957 480,519.6152422706631" fill="var(--bg-color)"></polygon>
  <text x="511.25" y="593.5671475544962" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">E3</text>

  <polygon points="555.0000000000001,649.5190528383289 547.5000000000001,740.4517202356949 480.00000000000006,727.4613391789285 480.00000000000006,623.5382907247957" fill="var(--accent-bg)"></polygon>
  <text x="507.5000000000001" y="690.9950054802453" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">E2</text>

  <polygon points="547.5000000000001,740.4517202356949 540.0000000000001,831.384387633061 480.0000000000001,831.384387633061 480.00000000000006,727.4613391789285" fill="var(--bg-color)"></polygon>
  <text x="503.7500000000001" y="788.4228634059948" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">E1</text>

  <!-- Row A -->

  <polygon points="210.00000000000023,779.4228634059948 240.00000000000023,831.3843876330611 300.0000000000002,831.3843876330611 277.5000000000002,766.4324823492282" fill="var(--bg-color)"></polygon>
  <text x="245.00000000000023" y="807.9084349911446" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">A1</text>

  <polygon points="180.00000000000017,727.4613391789285 210.00000000000023,779.4228634059948 277.5000000000002,766.4324823492282 255.00000000000017,701.4805770653954" fill="var(--accent-bg)"></polygon>
  <text x="218.7500000000002" y="749.4517202356951" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">A2</text>

  <polygon points="150.0000000000001,675.4998149518622 180.00000000000017,727.4613391789285 255.00000000000017,701.4805770653954 232.50000000000014,636.5286717815625" fill="var(--bg-color)"></polygon>
  <text x="192.50000000000014" y="690.9950054802455" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">A3</text>

  <polygon points="120.00000000000011,623.538290724796 150.0000000000001,675.4998149518622 232.50000000000014,636.5286717815625 210.0000000000001,571.5767664977295" fill="var(--accent-bg)"></polygon>
  <text x="166.2500000000001" y="632.5382907247958" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">A4</text>

  <polygon points="120.00000000000011,623.538290724796 90.00000000000011,571.5767664977296 165.0000000000001,519.6152422706633 210.0000000000001,571.5767664977295" fill="var(--bg-color)"></polygon>
  <text x="140.0000000000001" y="580.5767664977296" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">A5</text>

  <polygon points="90.00000000000011,571.5767664977296 60.00000000000006,519.6152422706633 120.00000000000006,467.653718043597 165.0000000000001,519.6152422706633" fill="var(--accent-bg)"></polygon>
  <text x="102.50000000000009" y="528.6152422706633" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">A6</text>

  <polygon points="60.00000000000006,519.6152422706633 30,467.653718043597 75,415.6921938165307 120.00000000000006,467.653718043597" fill="var(--bg-color)"></polygon>
  <text x="65.00000000000003" y="476.653718043597" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">A7</text>

  <polygon points="30,467.653718043597 0,415.6921938165307 30,363.73066958946436 75,415.6921938165307" fill="var(--accent-bg)"></polygon>
  <text x="27.5" y="424.6921938165307" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">A8</text>

  <!-- Row B -->

  <polygon points="277.5000000000002,766.4324823492282 300.0000000000002,831.3843876330611 360.0000000000002,831.3843876330611 345.0000000000001,753.4421012924618" fill="var(--accent-bg)"></polygon>
  <text x="308.7500000000002" y="801.4132444627614" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">B1</text>

  <polygon points="255.00000000000017,701.4805770653954 277.5000000000002,766.4324823492282 345.0000000000001,753.4421012924618 330.0000000000001,675.4998149518622" fill="var(--bg-color)"></polygon>
  <text x="290.0000000000001" y="729.9661486505452" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">B2</text>

  <polygon points="232.50000000000014,636.5286717815625 255.00000000000017,701.4805770653954 330.0000000000001,675.4998149518622 315.0000000000001,597.5575286112627" fill="var(--accent-bg)"></polygon>
  <text x="271.2500000000001" y="658.5190528383291" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">B3</text>

  <polygon points="210.0000000000001,571.5767664977295 232.50000000000014,636.5286717815625 315.0000000000001,597.5575286112627 300.00000000000006,519.6152422706632" fill="var(--bg-color)"></polygon>
  <text x="252.5000000000001" y="587.0719570261128" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">B4</text>

  <polygon points="210.0000000000001,571.5767664977295 165.0000000000001,519.6152422706633 240.00000000000003,467.65371804359694 300.00000000000006,519.6152422706632" fill="var(--accent-bg)"></polygon>
  <text x="222.50000000000009" y="528.6152422706632" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">B5</text>

  <polygon points="165.0000000000001,519.6152422706633 120.00000000000006,467.653718043597 179.99999999999994,415.6921938165307 240.00000000000003,467.65371804359694" fill="var(--bg-color)"></polygon>
  <text x="170.00000000000006" y="476.653718043597" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">B6</text>

  <polygon points="120.00000000000006,467.653718043597 75,415.6921938165307 119.99999999999994,363.73066958946436 179.99999999999994,415.6921938165307" fill="var(--accent-bg)"></polygon>
  <text x="117.49999999999997" y="424.6921938165307" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">B7</text>

  <polygon points="75,415.6921938165307 30,363.73066958946436 60,311.76914536239804 119.99999999999994,363.73066958946436" fill="var(--bg-color)"></polygon>
  <text x="64.99999999999997" y="372.73066958946436" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">B8</text>

  <!-- Row C -->

  <polygon points="345.0000000000001,753.4421012924618 360.0000000000002,831.3843876330611 420.00000000000017,831.3843876330611 412.5000000000001,740.4517202356951" fill="var(--bg-color)"></polygon>
  <text x="372.5000000000001" y="794.9180539343781" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">C1</text>

  <polygon points="330.0000000000001,675.4998149518622 345.0000000000001,753.4421012924618 412.5000000000001,740.4517202356951 405.0000000000001,649.519052838329" fill="var(--accent-bg)"></polygon>
  <text x="361.2500000000001" y="710.4805770653954" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">C2</text>

  <polygon points="315.0000000000001,597.5575286112627 330.0000000000001,675.4998149518622 405.0000000000001,649.519052838329 397.50000000000006,558.5863854409629" fill="var(--bg-color)"></polygon>
  <text x="350.0000000000001" y="626.0431001964125" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">C3</text>

  <polygon points="300.00000000000006,519.6152422706632 315.0000000000001,597.5575286112627 397.50000000000006,558.5863854409629 390,467.6537180435969" fill="var(--accent-bg)"></polygon>
  <text x="338.75000000000006" y="541.6056233274298" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">C4</text>

  <polygon points="300.00000000000006,519.6152422706632 240.00000000000003,467.65371804359694 315,415.69219381653056 390,467.6537180435969" fill="var(--bg-color)"></polygon>
  <text x="305" y="476.6537180435969" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">C5</text>

  <polygon points="240.00000000000003,467.65371804359694 179.99999999999994,415.6921938165307 239.99999999999994,363.7306695894643 315,415.69219381653056" fill="var(--accent-bg)"></polygon>
  <text x="237.49999999999997" y="424.6921938165306" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">C6</text>

  <polygon points="179.99999999999994,415.6921938165307 119.99999999999994,363.73066958946436 164.9999999999999,311.76914536239804 239.99999999999994,363.7306695894643" fill="var(--bg-color)"></polygon>
  <text x="169.99999999999994" y="372.73066958946436" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">C7</text>

  <polygon points="119.99999999999994,363.73066958946436 60,311.76914536239804 89.99999999999989,259.8076211353317 164.9999999999999,311.76914536239804" fill="var(--accent-bg)"></polygon>
  <text x="102.49999999999994" y="320.76914536239804" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">C8</text>

  <!-- Row D -->

  <polygon points="412.5000000000001,740.4517202356951 420.00000000000017,831.3843876330611 480.0000000000002,831.3843876330611 480.0000000000001,727.4613391789285" fill="var(--accent-bg)"></polygon>
  <text x="436.25000000000017" y="788.4228634059948" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">D1</text>

  <polygon points="405.0000000000001,649.519052838329 412.5000000000001,740.4517202356951 480.0000000000001,727.4613391789285 480.0000000000001,623.5382907247958" fill="var(--bg-color)"></polygon>
  <text x="432.5000000000001" y="690.9950054802455" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">D2</text>

  <polygon points="397.50000000000006,558.5863854409629 405.0000000000001,649.519052838329 480.0000000000001,623.5382907247958 480.00000000000006,519.6152422706632" fill="var(--accent-bg)"></polygon>
  <text x="428.7500000000001" y="593.5671475544962" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">D3</text>

  <polygon points="390,467.6537180435969 397.50000000000006,558.5863854409629 480.00000000000006,519.6152422706632 480,415.6921938165305" fill="var(--bg-color)"></polygon>
  <text x="425" y="496.1392896287467" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">D4</text>

  <polygon points="390,467.6537180435969 315,415.69219381653056 390,363.73066958946424 480,415.6921938165305" fill="var(--accent-bg)"></polygon>
  <text x="387.5" y="424.69219381653056" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">D5</text>

  <polygon points="315,415.69219381653056 239.99999999999994,363.7306695894643 299.99999999999994,311.7691453623979 390,363.73066958946424" fill="var(--bg-color)"></polygon>
  <text x="305" y="372.73066958946424" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">D6</text>

  <polygon points="239.99999999999994,363.7306695894643 164.9999999999999,311.76914536239804 209.9999999999999,259.80762113533166 299.99999999999994,311.7691453623979" fill="var(--accent-bg)"></polygon>
  <text x="222.49999999999991" y="320.769145362398" fill="var(--bg-color)" class="pointer-events-none" font-weight="bold">D7</text>

  <polygon points="164.9999999999999,311.76914536239804 89.99999999999989,259.8076211353317 119.99999999999989,207.84609690826534 209.9999999999999,259.80762113533166" fill="var(--bg-color)"></polygon>
  <text x="139.9999999999999" y="268.8076211353317" fill="var(--accent-bg)" class="pointer-events-none" font-weight="bold">D8</text>
</svg>
`;

// Now with IDs!!!!1
const rawSvg = addSquareIds(rawSvgTemplate);

export default function ThreePlayerBoard() {
  return (
    <div
      className="threeplayer-container"
      dangerouslySetInnerHTML={{ __html: rawSvg }}
    />
  )
}