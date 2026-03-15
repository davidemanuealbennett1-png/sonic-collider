from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import tempfile
import os
import io
import shutil
from collider import collide, save_wav

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg', 'm4a', 'flac'}
MAX_FILE_SIZE = 50 * 1024 * 1024

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/collide', methods=['POST'])
def collide_sounds():
    if 'sound_a' not in request.files or 'sound_b' not in request.files:
        return jsonify({'error': 'Two audio files required'}), 400

    file_a = request.files['sound_a']
    file_b = request.files['sound_b']

    if not allowed_file(file_a.filename) or not allowed_file(file_b.filename):
        return jsonify({'error': 'Unsupported file format'}), 400

    mode = request.form.get('mode', 'multiply')
    if mode not in ['intersect', 'multiply', 'xor', 'blend']:
        return jsonify({'error': 'Invalid mode'}), 400

    blend_amount = float(request.form.get('blend_amount', 0.5))
    blend_amount = max(0.0, min(1.0, blend_amount))
    duration = float(request.form.get('duration', 3.0))
    duration = max(1.0, min(300.0, duration))

    tmpdir = tempfile.mkdtemp()
    try:
        ext_a = file_a.filename.rsplit('.', 1)[1].lower()
        ext_b = file_b.filename.rsplit('.', 1)[1].lower()
        path_a = os.path.join(tmpdir, f'input_a.{ext_a}')
        path_b = os.path.join(tmpdir, f'input_b.{ext_b}')
        file_a.save(path_a)
        file_b.save(path_b)

        if os.path.getsize(path_a) > MAX_FILE_SIZE or os.path.getsize(path_b) > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large. Max 10MB'}), 400

        y_out, sr = collide(path_a, path_b, mode=mode, blend_amount=blend_amount, duration_seconds=duration)
        output_wav = os.path.join(tmpdir, 'output.wav')
        save_wav(y_out, sr, output_wav)

        with open(output_wav, 'rb') as f:
            audio_data = f.read()

    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return send_file(
        io.BytesIO(audio_data),
        mimetype='audio/wav',
        as_attachment=True,
        download_name=f'sonic_collision_{mode}.wav'
    )

@app.route('/collide-preview', methods=['POST'])
def collide_preview():
    if 'sound_a' not in request.files or 'sound_b' not in request.files:
        return jsonify({'error': 'Two audio files required'}), 400

    file_a = request.files['sound_a']
    file_b = request.files['sound_b']

    if not allowed_file(file_a.filename) or not allowed_file(file_b.filename):
        return jsonify({'error': 'Unsupported file format'}), 400

    mode = request.form.get('mode', 'multiply')
    blend_amount = float(request.form.get('blend_amount', 0.5))
    duration = min(float(request.form.get('duration', 300.0)), 300.0)

    tmpdir = tempfile.mkdtemp()
    try:
        ext_a = file_a.filename.rsplit('.', 1)[1].lower()
        ext_b = file_b.filename.rsplit('.', 1)[1].lower()
        path_a = os.path.join(tmpdir, f'input_a.{ext_a}')
        path_b = os.path.join(tmpdir, f'input_b.{ext_b}')
        file_a.save(path_a)
        file_b.save(path_b)

        y_out, sr = collide(path_a, path_b, mode=mode, blend_amount=blend_amount, duration_seconds=duration)
        output_wav = os.path.join(tmpdir, 'preview.wav')
        save_wav(y_out, sr, output_wav)

        with open(output_wav, 'rb') as f:
            audio_data = f.read()

    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return send_file(
        io.BytesIO(audio_data),
        mimetype='audio/wav',
        as_attachment=True,
        download_name='preview.wav'
    )

if __name__ == '__main__':
    import os
port = int(os.environ.get("PORT", 5000))
app.run(debug=False, host="0.0.0.0", port=port)